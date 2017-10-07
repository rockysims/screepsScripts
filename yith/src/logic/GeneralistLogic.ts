import Util from 'util/Util';
import Action from 'action/Action';
import SpawnRequest from 'SpawnRequest';
import All from 'All';

export default class GeneralistLogic {
	static onTick() {}

	static run(creep: Creep) {
		if (Action.continue(creep)) return;

		let creepEnergy = creep.carry.energy || 0;
		let mem = creep.memory;
		let origMemHarvesting = mem.harvesting;

		if (creepEnergy == 0) mem.harvesting = true;
		else if (creepEnergy >= creep.carryCapacity) mem.harvesting = false;

		if (mem.harvesting) {
			Action.fillEnergy(creep);
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
		}

		if (mem.harvesting != origMemHarvesting) {
			if (mem.harvesting) creep.say('get');
			else creep.say('put');
		}

		Action.continue(creep);
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		let countByRole: {[role: string]: number} = Util.countByRole(All.creepsIn(room));
		let requestSpawn = (countByRole['generalist'] || 0) < 2
			&& (
				(countByRole['miner'] || 0) < 1
				|| (countByRole['carrier'] || 0) < 1
			);

		if (requestSpawn) {
			return {
				priority: 8,
				generateBody: (energyAvailable: number): string[] => {
					return Util.generateBodyFromSet([WORK, CARRY, MOVE, MOVE], energyAvailable);
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