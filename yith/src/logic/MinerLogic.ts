import Log from "util/Log";
import Util from "util/Util";
import Action from "util/Action";
import All from 'All';
import SpawnRequest from 'SpawnRequest';
import Store from "util/Store";

export default class MinerLogic {
	static onTick() {
		//All.rooms().forEach((room: Room) => {
		//	if (Util.costOf([WORK, WORK, WORK, WORK, WORK, MOVE]) <= room.energyCapacityAvailable) {
		//		//calc minerCount
		//		const minerCount: number = Util.countByRoleInRoom('miner', room);
		//
		//		//fill sourcesWithContainerOrSite & sourcesWithoutContainer[]
		//		const sourcesWithoutContainerOrSite: Source[] = [];
		//		const sourcesWithContainerOrSite: Source[] = [];
		//		const sources: Source[] = room.find(FIND_SOURCES);
		//		const containers: Container[] = room.find(FIND_STRUCTURES, { //not FIND_MY_STRUCTURES
		//			filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
		//		});
		//		const containerSites: ConstructionSite[] = room.find(FIND_CONSTRUCTION_SITES, {
		//			filter: (containerSite: ConstructionSite) => containerSite.structureType == STRUCTURE_CONTAINER
		//		});
		//		sources.forEach((source: Source) => {
		//			const container = containers
		//				.filter((container: Container) => container.pos.inRangeTo(source, 1))
		//				[0];
		//			const containerSite = containerSites
		//				.filter((containerSite: ConstructionSite) => containerSite.pos.inRangeTo(source, 1))
		//				[0];
		//			if (container || containerSite) {
		//				sourcesWithContainerOrSite.push(source);
		//			} else {
		//				sourcesWithoutContainerOrSite.push(source);
		//			}
		//		});
		//
		//		//if (enough miners && more sources) build container
		//		const enoughMiners = sourcesWithContainerOrSite.length <= minerCount;
		//		if (enoughMiners && sourcesWithoutContainerOrSite.length > 0) {
		//			//place container next to sourcesWithoutContainer[nearest to spawn]
		//			const spawn = All.spawnsIn(room)[0];
		//			if (spawn) {
		//				const source = spawn.pos.findClosestByPath(sourcesWithoutContainerOrSite, {
		//					ignoreCreeps: true
		//				});
		//				const tilesBySource: RoomPosition[] = Util
		//					.getAdjacent8(source)
		//					.filter((pos: RoomPosition) => Util.isBuildable([pos]));
		//				const posBySource = spawn.pos.findClosestByPath(tilesBySource, {
		//					ignoreCreeps: true
		//				});
		//
		//				if (posBySource) {
		//					room.createConstructionSite(posBySource, STRUCTURE_CONTAINER);
		//					const containerSite: ConstructionSite|undefined = room.lookForAt<ConstructionSite>(LOOK_CONSTRUCTION_SITES, posBySource)[0];
		//					if (containerSite) {
		//
		//
		//
		//
		//						//nice because container removed is handled automatically
		//						Mem.byId(containerSite)['isInputContainer'] = true;
		//
		//						//nice because transition from construction site to container is handled automatically
		//						Mem.byPos(containerSite)['isInputContainer'] = true;
		//
		//						//solves transition from site to built
		//						//gives an efficient way to loop over room's inputs
		//						//remove invalid inputs while reading list
		//
		//						//const memPositions: RoomPosition[] = Mem.getOrPut(room.name + ':inputStructurePositions', []);
		//						//memPositions.push(containerSite.pos);
		//
		//						//or
		//
		//						const inputsKey = 'inputStructurePositions';
		//						room.memory[inputsKey] = room.memory[inputsKey] || [];
		//						const inputs: RoomPosition[] = room.memory[inputsKey];
		//						inputs.push(containerSite.pos);
		//
		//
		//					}
		//				} else {
		//					Log.error('MinerLogic::onTick() failed to find posBySource.');
		//				}
		//			} else {
		//				Log.warn('MinerLogic::onTick() failed to find spawn.');
		//			}
		//		}
		//	}
		//});
	}

	static run(creep: Creep) {
		const mem = creep.memory;

		//try to set mem['sourceId'] && source
		if (!mem['sourceId']) {
			const minersInRoom: Creep[] = All.creepsByRoleIn('miner', creep.room);

			//fill unclaimedSources (excluding sources with miner already)
			const sources: Source[] = creep.room.find(FIND_SOURCES);
			const unclaimedSources: Source[] = [];
			sources.forEach((source) => {
				const sourceClaimed = minersInRoom.some(miner => miner.memory['sourceId'] == source.id);
				if (!sourceClaimed) unclaimedSources.push(source);
			});

			const spawn = All.spawnsIn(creep.room)[0];
			const pos: RoomPosition = (spawn)?spawn.pos:creep.pos;
			const source = pos.findClosestByPath(unclaimedSources);
			if (source) {
				mem['sourceId'] = source.id;
			} else {
				Log.error('MinerLogic::run() failed to find source.');
			}
		}
		const source: Source|undefined = Game.getObjectById(mem['sourceId']) || undefined;

		//try to set mem['targetId'] && target
		if (source && !Game.getObjectById(mem['targetId'])) {
			if (!Game.getObjectById(mem['targetSiteId'])) {
				//try to find target and set mem['targetId'] || place targetSite
				const target = <Container>source.pos.findInRange(FIND_STRUCTURES, 1, { //not FIND_MY_STRUCTURES
					filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
				})[0];
				if (target) {
					mem['targetId'] = target.id;
					Store.addMinerContainer(target);
				} else {
					//try to find targetSite and set mem['targetSiteId'] || place targetSite
					const targetSite = <ConstructionSite>source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
						filter: (site: ConstructionSite) => site.structureType == STRUCTURE_CONTAINER
					})[0];
					if (targetSite) {
						mem['targetSiteId'] = targetSite.id;
					} else {
						const spawn = All.spawnsIn(creep.room)[0];
						const roomCtrl = creep.room.controller;
						if (spawn && roomCtrl && roomCtrl.level > 1) {
							placeMinerContainerForSourceNear(source, spawn.pos);

							//TODO: fix bug where after first container all others get build without waiting

						}
					}
				}
			}
		}
		const target: Structure|undefined = Game.getObjectById(mem['targetId']) || undefined;

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

		//////////////////////////////////

		function placeMinerContainerForSourceNear(source: Source, pos: RoomPosition) {
			const tilesBySource: RoomPosition[] = Util
				.getAdjacent8(source)
				.filter((pos: RoomPosition) => Util.isBuildable([pos]));
			const posBySource = pos.findClosestByPath(tilesBySource, {
				ignoreCreeps: true
			});

			if (posBySource) {
				creep.room.createConstructionSite(posBySource, STRUCTURE_CONTAINER);
			} else {
				Log.error('MinerLogic::onTick() failed to find posBySource.');
			}
		}

	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		const minerCount = All.creepsByRoleIn('miner', room).length;
		const sourceCount = All.sourcesIn(room).length;
		const minerCountainerCount = Store.minerContainersIn(room).length;

		//TODO: only request spawn if (not all minerContainers are full || 0 minerContainers)
		const requestSpawn = minerCount < sourceCount && minerCountainerCount >= minerCount;
		if (requestSpawn) {
			const minerCost = Util.costOf([WORK, WORK, WORK, WORK, WORK, MOVE]);
			const priority = (minerCost <= room.energyCapacityAvailable)
				? Math.max(4, 7 - minerCount)
				: (minerCount <= 0)
					? 5
					: 0;
			return {
				priority: priority,
				generateBody: (energyAvailable: number): string[] => {
					const body: string[] = [MOVE];
					energyAvailable -= Util.costOf([MOVE]);

					const workCost = Util.costOf([WORK]);
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