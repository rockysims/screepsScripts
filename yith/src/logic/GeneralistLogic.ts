import Util from "util/Util";
import Action from "util/Action";
import SpawnRequest from 'SpawnRequest';
import All from "All";

export default class GeneralistLogic {
	static onTick() {}

	static run(creep: Creep) {
		let creepEnergy = creep.carry.energy || 0;
		let mem = creep.memory;
		let origMemHarvesting = mem.harvesting;

		if (mem.harvesting) {
			Action.fillEnergy(creep);
			if (creepEnergy >= creep.carryCapacity) {
				mem.harvesting = false;
			}
		} else {
			let target = creep.pos.findClosestByPath(
				All.towersIn(creep.room).filter((tower: Tower) => tower.energy < 100)
			);

			target = target || creep.pos.findClosestByPath(FIND_STRUCTURES, {
				filter: (structure: Structure) => {
					return (structure.structureType == STRUCTURE_EXTENSION
							|| structure.structureType == STRUCTURE_SPAWN
						) &&
						(<Extension|Spawn>structure).energy < (<Extension|Spawn>structure).energyCapacity;
				}
			});

			target = target || creep.pos.findClosestByPath(
					All.towersIn(creep.room).filter((tower: Tower) => tower.energy + 50 < tower.energyCapacity)
			);

			let constructionSite: ConstructionSite|undefined = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			let roomCtrl: Controller|undefined = creep.room.controller;

			if (target) Action.deliver(creep, target);
			else if (roomCtrl && roomCtrl.ticksToDowngrade < CONTROLLER_DOWNGRADE[roomCtrl.level] - 500) Action.upgrade(creep, roomCtrl);
			else if (constructionSite) Action.build(creep, constructionSite);
			else if (roomCtrl) Action.upgrade(creep, roomCtrl);
			else Action.idle(creep);

			if (creepEnergy <= 0) {
				mem.harvesting = true;
			}
		}

		if (mem.harvesting != origMemHarvesting) {
			if (mem.harvesting) creep.say('get');
			else creep.say('put');
		}
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		let countByRole: {[role: string]: number} = Util.countByRole(All.creepsIn(room));
		const generalistMax = (room.controller && room.controller.level > 1) ? 3 : 2;
		let requestSpawn = (countByRole['generalist'] || 0) < generalistMax
			&& (
				(countByRole['miner'] || 0) < 1
				|| (countByRole['carrier'] || 0) < 1
			);

		if (requestSpawn) {
			return {
				priority: Math.max(1, 9 - (countByRole['generalist'] || 0)),
				generateBody: (energyAvailable: number): string[] => {
					if (countByRole['generalist'] > 0) {
						return Util.generateBodyFromSet([WORK, CARRY, MOVE, MOVE], energyAvailable);
					} else {
						return [WORK, CARRY, MOVE, MOVE];
					}
				},
				memory: {role: 'generalist'}
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