import Log from "util/Log";
import Util from "util/Util";
import Action from "util/Action";
import All from 'All';
import SpawnRequest from 'SpawnRequest';
import Mem from "util/Mem";

//TODO: reverse container triggers miner to miner triggers contains (so miner can be built first)

export default class MinerLogic {
	static onTick() {
		All.rooms().forEach((room: Room) => {
			if (Util.costOf([WORK, WORK, WORK, WORK, WORK, MOVE]) <= room.energyCapacityAvailable) {
				//calc minerCount
				let minerCount: number = Util.countByRoleInRoom('miner', room);

				//fill sourcesWithContainerOrSite & sourcesWithoutContainer[]
				let sourcesWithoutContainerOrSite: Source[] = [];
				let sourcesWithContainerOrSite: Source[] = [];
				let sources: Source[] = room.find(FIND_SOURCES);
				let containers: Container[] = room.find(FIND_STRUCTURES, { //not FIND_MY_STRUCTURES
					filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
				});
				let containerSites: ConstructionSite[] = room.find(FIND_CONSTRUCTION_SITES, {
					filter: (containerSite: ConstructionSite) => containerSite.structureType == STRUCTURE_CONTAINER
				});
				sources.forEach((source: Source) => {
					let container = containers
						.filter((container: Container) => container.pos.inRangeTo(source, 1))
						[0];
					let containerSite = containerSites
						.filter((containerSite: ConstructionSite) => containerSite.pos.inRangeTo(source, 1))
						[0];
					if (container || containerSite) {
						sourcesWithContainerOrSite.push(source);
					} else {
						sourcesWithoutContainerOrSite.push(source);
					}
				});

				//if (enough miners && more sources) build container
				let enoughMiners = sourcesWithContainerOrSite.length <= minerCount;
				if (enoughMiners && sourcesWithoutContainerOrSite.length > 0) {
					//place container next to sourcesWithoutContainer[nearest to spawn]
					let spawn = All.spawnsIn(room)[0];
					if (spawn) {
						let source = spawn.pos.findClosestByPath(sourcesWithoutContainerOrSite, {
							ignoreCreeps: true
						});
						let tilesBySource: RoomPosition[] = Util
							.getAdjacent8(source.pos)
							.filter((pos: RoomPosition) => Util.isBuildable([pos]));
						let posBySource = spawn.pos.findClosestByPath(tilesBySource, {
							ignoreCreeps: true
						});

						if (posBySource) {
							room.createConstructionSite(posBySource, STRUCTURE_CONTAINER);
							let containerSite: ConstructionSite|undefined = room.lookForAt<ConstructionSite>(LOOK_CONSTRUCTION_SITES, posBySource)[0];
							if (containerSite) {




								//nice because container removed is handled automatically
								Mem.byId(containerSite)['isInputContainer'] = true;

								//nice because transition from construction site to container is handled automatically
								Mem.byPos(containerSite)['isInputContainer'] = true;

								//solves transition from site to built
								//gives an efficient way to loop over room's inputs
								//remove invalid inputs while reading list

								//let memPositions: RoomPosition[] = Mem.getOrPut(room.name + ':inputStructurePositions', []);
								//memPositions.push(containerSite.pos);

								//or

								let inputsKey = 'inputStructurePositions';
								room.memory[inputsKey] = room.memory[inputsKey] || [];
								let inputs: RoomPosition[] = room.memory[inputsKey];
								inputs.push(containerSite.pos);


							}
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
			let minersInRoom: Creep[] = All
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

		//try to set mem['targetId'] && target
		if (source && (!mem['targetId'] || !Game.getObjectById(mem['targetId']))) {
			let target: Structure = <Structure>source.pos.findInRange(FIND_STRUCTURES, 1, { //not FIND_MY_STRUCTURES
				filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
			})[0];
			if (target) {
				mem['targetId'] = target.id;
			} else {
				Log.warn('MinerLogic::run() failed to find target.');
			}
		}
		let target: Structure|undefined = Game.getObjectById(mem['targetId']) || undefined;

		//harvest || moveTo target
		if (source && target) {
			if (creep.pos.isEqualTo(target)) {
				Action.harvest(creep, source);
			} else {
				Action.moveTo(creep, target, '#ff00ff');
			}
		} else if (source) {
			Action.harvest(creep, source);
		}
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		let creepsInRoom = All.creepsIn(room);
		let countByRole: {[role: string]: number} = Util.countByRole(creepsInRoom);
		let minerCount: number = countByRole['miner'] || 0;

		let containerCount: number = room.find(FIND_STRUCTURES, { //not FIND_MY_STRUCTURES
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
					while (energyAvailable - workCost >= 0) {
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