import Util from 'util/Util';
import Action from 'action/Action';
import GeneralistLogic from 'logic/GeneralistLogic';
import SpawnRequest from 'SpawnRequest';
import All from 'All';
import Mem from "util/Mem";

interface BuilderCreepMemory {
	building: boolean;
}

export default class BuilderLogic {
	static onTick() {
		//no op
	}

	static run(creep: Creep) {
		if (Action.continue(creep)) return;

		const constructionSite: ConstructionSite|null = creep.pos.findClosestByPath(All.constructionSitesIn(creep.room));
		if (!constructionSite) {
			GeneralistLogic.run(creep);
			return;
		}

		const creepEnergy = creep.carry.energy || 0;
		const mem: BuilderCreepMemory = Mem.of(creep);
		const origMemBuilding = mem.building;

		if (mem['building']) {
			if (constructionSite) Action.build(creep, constructionSite);
			else Action.idle(creep);

			if (creepEnergy <= 0) {
				mem['building'] = false;
			}
		} else {
			Action.fillEnergy(creep);
			if (creepEnergy >= creep.carryCapacity) {
				mem['building'] = true;
			}
		}

		if (mem['building'] != origMemBuilding) {
			if (mem['building']) creep.say('build');
			else creep.say('collect');
		}

		Action.continue(creep);
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		let countByRole = Util.countByRole(All.creepsIn(room, true));
		let builderCount = countByRole['builder'] || 0;
		let constructionSiteCount = All.constructionSitesIn(room).length;

		if (constructionSiteCount > builderCount) {
			let priority = 6;
			if (builderCount > 0) {
				let desiredSpawnsCount = Math.max(0, constructionSiteCount - builderCount);
				priority = Math.min(3 + desiredSpawnsCount, 6);
				priority = Math.max(1, priority - builderCount);
			}
			return {
				priority: priority,
				generateBody: (availableEnergy: number): BodyPartConstant[] => {
					return Util.generateBodyFromSet([WORK, CARRY, MOVE, MOVE], availableEnergy);
				},
				memory: {role: 'builder'}
			};
		} else {
			return {
				priority: 0,
				generateBody: () => [],
				memory: {role: 'none'}
			};
		}
	}
}