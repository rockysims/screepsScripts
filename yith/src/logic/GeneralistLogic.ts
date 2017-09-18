import Util from "util/Util";
import Action from "util/Action";
import getAll from 'getAll';
import SpawnRequest from 'SpawnRequest';

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
			let target: Container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
				filter: (structure: Structure) => {
					return (structure.structureType == STRUCTURE_EXTENSION
							|| structure.structureType == STRUCTURE_SPAWN
						) &&
						(<Extension|Spawn>structure).energy < (<Extension|Spawn>structure).energyCapacity;
				}
			});
			let constructionSite: ConstructionSite|undefined = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			let roomCtrl: Controller|undefined = creep.room.controller;

			if (target) Action.deliver(creep, target);
			else if (roomCtrl && roomCtrl.ticksToDowngrade < 1000) Action.upgrade(creep, roomCtrl);
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
		let all = getAll();

		let creepsInRoom = all.creeps
			.filter((creep: Creep) => creep.room.name == room.name);
		let countByRole: {[role: string]: number} = Util.countByRole(creepsInRoom);
		let requestSpawn = (countByRole['generalist'] || 0) < 2
			&& (
				(countByRole['miner'] || 0) < 1
				|| (countByRole['carrier'] || 0) < 1
			);

		if (requestSpawn) {
			return {
				priority: 8,
				generateBody: (): string[] => {
					return [WORK, CARRY, MOVE, MOVE];
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