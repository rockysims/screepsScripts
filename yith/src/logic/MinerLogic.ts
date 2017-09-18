import Log from "util/Log";
import Util from "util/Util";
import Action from "util/Action";
import getAll from 'getAll';
import SpawnRequest from 'SpawnRequest';

export default class MinerLogic {
	static onTick() {
		let all = getAll();

		all.rooms.forEach((room: Room) => {
			if (Util.costOf([WORK, WORK, WORK, WORK, WORK, MOVE]) <= room.energyCapacityAvailable) {
				//calc minerCount
				let creepsInRoom = all.creeps
					.filter((creep: Creep) => creep.room.name == room.name);
				let countByRole: {[role: string]: number} = Util.countByRole(creepsInRoom);
				let minerCount: number = countByRole['miner'];

				//fill sourcesWithContainer & sourcesWithoutContainer[]
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
					//place container next to sourcesWithoutContainer[nearest to spawn]
					let spawn = all.spawns
						.filter((spawn: Spawn) => spawn.room.name == room.name)
						[0];
					if (spawn) {
						let source = spawn.pos.findClosestByPath(sourcesWithoutContainer);
						let posBySource = PathFinder.search(spawn.pos, source.pos).path.pop();

						if (posBySource) {
							room.createConstructionSite(posBySource, STRUCTURE_CONTAINER);
						} else {
							Log.error('MinerLogic::onTick() failed to find posBySource.');
						}
					} else {
						Log.warn('MinerLogic::onTick() failed to find spawn.');
					}
				}
			}
		});
	}

	static run(creep: Creep) {
		let mem = creep.memory;

		//try to set mem['sourceId'] && source
		if (!mem['sourceId']) {
			//fill minersInRoom[]
			let minersInRoom: Creep[] = Util
				.creepsIn(creep.room)
				.filter((crp) => crp.memory.role == 'miner');

			//fill sources (excluding sources with miner already)
			let sources: Source[] = creep.room.find(FIND_SOURCES);
			minersInRoom.forEach((miner: Creep) => {
				let minerSourceId: string = miner.memory['sourceId'];
				sources = sources.filter((src) => src.id != minerSourceId);
			});

			let source: Source = sources[0];
			if (source) {
				mem['sourceId'] = source.id;
			} else {
				Log.error('MinerLogic::run() failed to find source.');
			}
		}
		let source: Source|undefined = Game.getObjectById(mem['sourceId']) || undefined;

		//try to set mem['containerId'] && container
		if (source && !mem['containerId']) {
			let container: Container = <Container>source.pos.findInRange(FIND_MY_STRUCTURES, 1, {
				filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
			})[0];
			if (container) {
				mem['containerId'] = container.id;
			} else {
				Log.error('MinerLogic::run() failed to find container.');
			}
		}
		let container: Container|undefined = Game.getObjectById(mem['containerId']) || undefined;

		//harvest || moveTo container
		if (source && container) {
			if (creep.pos.isEqualTo(container)) {
				Action.harvest(creep, source);
			} else {
				Action.moveTo(creep, container, '#ff00ff');
			}
		}
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
				memory: {role: 'miner'}
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