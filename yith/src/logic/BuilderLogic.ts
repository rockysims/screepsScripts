import Util from "util/Util";
import Action from "util/Action";
import GeneralistLogic from 'logic/GeneralistLogic';
import SpawnRequest from 'SpawnRequest';

export default class BuilderLogic {
	static onTick() {
		//no op
	}

	static run(creep: Creep) {
		let constructionSite: ConstructionSite = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
		if (!constructionSite) {
			GeneralistLogic.run(creep);
			return;
		}

		let creepEnergy = creep.carry.energy || 0;
		let mem = creep.memory;
		let origMemBuilding = mem.building;

		if (mem.building) {
			if (constructionSite) Action.build(creep, constructionSite);
			else Action.idle(creep);

			if (creepEnergy <= 0) {
				mem.building = false;
			}
		} else {
			Action.fillEnergy(creep);
			if (creepEnergy >= creep.carryCapacity) {
				mem.building = true;
			}
		}

		if (mem.building != origMemBuilding) {
			if (mem.building) creep.say('build');
			else creep.say('collect');
		}
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		let countByRole = Util.countByRole(Util.creepsIn(room));
		let builderCount = countByRole['builder'] || 0;
		let constructionSiteCount = room.find(FIND_CONSTRUCTION_SITES).length;

		if (constructionSiteCount > builderCount) {
			let priority = 7;
			if (builderCount > 0) {
				let desiredSpawnsCount = Math.max(0, constructionSiteCount - builderCount);
				priority = Math.min(3 + desiredSpawnsCount, 7);
			}
			return {
				priority: priority,
				generateBody: (availableEnergy: number): string[] => {
					let set = [WORK, CARRY, MOVE, MOVE];
					let setCost = Util.costOf(set);
					let body = [];

					while (Util.costOf(body) + setCost <= availableEnergy) {
						body.push(... set);
					}

					return body;
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