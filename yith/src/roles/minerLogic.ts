import Log from "../util/Log";
import Util from "util/Util";
import getAll from 'getAll';
import SpawnRequest from '../SpawnRequest';

export default class MinerLogic {
	static onTick() {
		let all = getAll();

		all.rooms.forEach((room: Room) => {
			//calc minerCount
			let creepsInRoom = all.creeps
				.filter((creep: Creep) => creep.room.name == room.name);
			let countByRole: {[role: string]: number} = Util.countByRole(creepsInRoom);
			let minerCount: number = countByRole['miner'];

			//fill sourcesWithContainer & fill sourcesWithoutContainer[]
			let sourcesWithoutContainer: Source[] = [];
			let sourcesWithContainer: Source[] = [];
			let sources: Source[] = room.find(FIND_SOURCES);
			let containers: Container[] = room.find(FIND_MY_STRUCTURES, {
				filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
			});
			sources.forEach((source: Source) => {
				let container = containers
					.filter((container: Container) => container.pos.inRangeTo(source, 1))
					[0];
				if (container) {
					sourcesWithContainer.push(source);
				} else {
					sourcesWithoutContainer.push(source);
				}
			});

			//if (enough miners && more sources) build container
			let enoughMiners = sourcesWithContainer.length <= minerCount;
			if (enoughMiners && sourcesWithoutContainer.length > 0) {
				//calc posBySource
				let spawn = all.spawns
					.filter((spawn: Spawn) => spawn.room.name == room.name)
					[0];
				let source = sourcesWithoutContainer[0];
				if (spawn) source = spawn.pos.findClosestByPath(sourcesWithoutContainer);
				let posBySource = PathFinder.search(spawn.pos, source.pos).path.pop();

				if (posBySource) {
					room.createConstructionSite(posBySource, STRUCTURE_CONTAINER);
				} else {
					Log.error('MinerLogic::onTick() failed to find posBySource.');
				}
			}
		});
	}

	static run(creep: Creep) {







		//if (on top of source container) mine
		//else move to source



		let sourceContainers: Container[] = creep.room.find(FIND_MY_STRUCTURES, {
			filter: (structure: Structure) =>
				structure.structureType == STRUCTURE_CONTAINER
				&& structure.pos.findInRange(FIND_SOURCES, 1).length > 0
		});

		console.log('sourceContainers.length: ' + sourceContainers.length);









	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		let all = getAll();

		let creepsInRoom = all.creeps
			.filter((creep: Creep) => creep.room.name == room.name);
		let countByRole: {[role: string]: number} = Util.countByRole(creepsInRoom);
		let minerCount: number = countByRole['miner'];

		let containerCount: number = room.find(FIND_MY_STRUCTURES, {
			filter: (structure: Structure) =>
				structure.structureType == STRUCTURE_CONTAINER
				&& structure.pos.inRangeTo(structure, 1)
		}).length;

		let requestSpawn = minerCount < containerCount;
		if (requestSpawn) {
			return {
				priority: Math.max(4, 7 - minerCount),
				generateBody: (energyAvailable: number): string[] => {
					let body: string[] = [MOVE];
					energyAvailable -= Util.costOf([MOVE]);

					let workCost = Util.costOf([WORK]);
					while (energyAvailable - workCost > 0) {
						energyAvailable -= workCost;
						body.unshift(WORK);
						if (body.length >= 6) {
							break;
						}
					}

					return body;
				},
				memory: {role: 'harvester'}
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