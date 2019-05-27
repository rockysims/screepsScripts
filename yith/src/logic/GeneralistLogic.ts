import Util from 'util/Util';
import Action from 'action/Action';
import SpawnRequest from 'SpawnRequest';
import All from 'All';
import Mem from "util/Mem";

export default class GeneralistLogic {
	static onTick() {}

	static run(creep: Creep) {
		//const start = new Date().getTime();
		if (Action.continue(creep)) return;

		let creepEnergy = creep.carry.energy || 0;
		let mem = Mem.of(creep);
		let origMemHarvesting = mem.harvesting;

		if (creepEnergy == 0) mem.harvesting = true;
		else if (creepEnergy >= creep.carryCapacity) mem.harvesting = false;

		//console.log('duration generalist::run() a: ', new Date().getTime() - start);

		if (mem.harvesting) {
			Action.fillEnergy(creep);
		} else {
			let target: Structure|null = creep.pos.findClosestByPath(
				All.towersIn(creep.room).filter((tower: StructureTower) => tower.energy < 100)
			);

			if (!target) {
				const spawnAndExtensionTargets: Structure[] = All
					.structures()
					.filter((structure: Structure) => {
						return (structure.structureType == STRUCTURE_EXTENSION
								|| structure.structureType == STRUCTURE_SPAWN
							) &&
							(<StructureExtension|StructureSpawn>structure).energy < (<StructureExtension|StructureSpawn>structure).energyCapacity;
					});
				target = creep.pos.findClosestByPath(spawnAndExtensionTargets) as StructureExtension|StructureSpawn;
			}

			//console.log('duration generalist::run() b: ', new Date().getTime() - start);

			target = target || creep.pos.findClosestByPath(
					All.towersIn(creep.room).filter((tower: StructureTower) => tower.energy + 50 < tower.energyCapacity)
			);

			let roomCtrl: StructureController|undefined = creep.room.controller;

			//TODO: consider prioritizing terminal over nuker when terminal is low on energy (<100000?)
			if (!target) {
				const nuker = All.nukerIn(creep.room);
				if (nuker && Util.freeSpaceIn(nuker, RESOURCE_ENERGY) > 0) {
					target = nuker;
				}
			}

			const terminal = creep.room.terminal;
			if (terminal && (roomCtrl && roomCtrl.level >= 6)) {
				const terminalSpace = Util.freeSpaceIn(terminal);
				const terminalEnergy = terminal.store[RESOURCE_ENERGY];
				const terminalWantsEnergy = terminalEnergy < 100000 || (roomCtrl && roomCtrl.level >= 8);
				if (terminalWantsEnergy && (creep.carry.energy || 0) <= terminalSpace) {
					target = target || creep.room.terminal;
				}
			}

			let constructionSite: ConstructionSite|null = creep.pos.findClosestByPath(All.constructionSitesIn(creep.room));

			if (roomCtrl && roomCtrl.ticksToDowngrade < CONTROLLER_DOWNGRADE[roomCtrl.level] - 4000) Action.upgrade(creep, roomCtrl);
			else if (target) Action.deliver(creep, target, RESOURCE_ENERGY);
			else if (constructionSite) Action.build(creep, constructionSite);
			else if (roomCtrl) Action.upgrade(creep, roomCtrl);
			else Action.idle(creep);
		}

		//console.log('duration generalist::run() y: ', new Date().getTime() - start);

		//TODO: consider removing calls to creep.say() since it seems to have low performance (this block took 5ms)
		if (mem.harvesting != origMemHarvesting) {
			if (mem.harvesting) creep.say('get');
			else creep.say('put');
		}

		Action.continue(creep);

		//console.log('duration generalist::run() z: ', new Date().getTime() - start);
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		const countByRole: {[role: string]: number} = Util.countByRole(All.creepsIn(room, true));
		const generalistCount = countByRole['generalist'] || 0;
		const roomCtrlLevel = (!room.controller)?0:room.controller.level;
		const generalistMax = room.controller
			?((roomCtrlLevel == 1)
				?2
				:(16 - Math.min(roomCtrlLevel*2, 14))
			)
			:0;
		const requestSpawn = (countByRole['generalist'] || 0) < generalistMax
			&& (
				(countByRole['miner'] || 0) < 1
				|| (countByRole['carrier'] || 0) < 1
			);

		if (requestSpawn) {
			return {
				priority: Math.max(1, 8 - generalistCount),
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
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