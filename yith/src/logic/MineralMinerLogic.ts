import Log from "util/Log";
import Util from "util/Util";
import Action from "util/Action";
import All from 'All';
import SpawnRequest from 'SpawnRequest';

export default class MineralMinerLogic {
	static onTick() {
		All.rooms().forEach(room => {
			if (!room.controller || room.controller.level < 6) return; //can't mine minerals yet

			const mineral = All.mineralsIn(room)[0];
			if (mineral) {
				const extractor = All.extractorsIn(room)[0];
				if (!extractor) {
					const extractorSite = All.constructionSitesIn(room, STRUCTURE_EXTRACTOR)[0];
					if (!extractorSite) {
						room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
					}
				}

				const container = Game.getObjectById(room.memory['mineralContainerId']);
				if (!container) {
					const containerSitePoint: {x: number, y: number}|undefined = room.memory['mineralContainerSitePoint'];
					if (containerSitePoint) {
						delete room.memory['mineralContainerSitePoint'];

						const containerSitePos = room.getPositionAt(containerSitePoint.x, containerSitePoint.y);
						if (containerSitePos) {
							const containerSite: ConstructionSite|undefined = room.lookForAt<ConstructionSite>(LOOK_CONSTRUCTION_SITES, containerSitePos)[0];
							if (containerSite) {
								room.memory['mineralContainerSiteId'] = containerSite.id;
							}
						}
					}

					const containerSite = Game.getObjectById(room.memory['mineralContainerSiteId']);
					if (!containerSite) {
						if (!room.memory['mineralContainerSiteId']) {
							const pos = placeContainerSite(room, mineral);
							if (pos) {
								//save pos so we can grab container site's id during next tick
								//note: storing pos in memory causes bug where pos != thingInPos.pos in future ticks so store x and y instead
								room.memory['mineralContainerSitePoint'] = {x: pos.x, y: pos.y};
							} else {
								Log.error('MineralMinerLogic::onTick() failed to place mineral container.');
							}
						} else { //just finished building container?
							delete room.memory['mineralContainerSiteId'];

							const newContainer = <Container>mineral.pos.findInRange(FIND_STRUCTURES, 1, { //not FIND_MY_STRUCTURES
								filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
							})[0];
							if (newContainer) {
								room.memory['mineralContainerId'] = newContainer.id;
							} else {
								Log.error('MineralMinerLogic::onTick() could not find newContainer.');
							}
						}
					} //else containerSite already exists
				} //else container already exists
			}
		});

		//////////////////////

		function placeContainerSite(room: Room, mineral: Mineral): RoomPosition|null {
			const spawn = All.spawnsIn(room)[0];
			const tilesByMineral: RoomPosition[] = Util
				.getAdjacent8(mineral)
				.filter((pos: RoomPosition) => Util.isBuildable([pos]));
			const posByMineral = (spawn || mineral).pos.findClosestByPath(tilesByMineral, {
				ignoreCreeps: true
			});

			if (posByMineral) {
				room.createConstructionSite(posByMineral, STRUCTURE_CONTAINER);
				return posByMineral;
			} else {
				Log.error('MineralMinerLogic::onTick() failed to find posByMineral.');
				return null;
			}
		}
	}

	static run(creep: Creep) {
		const room = creep.room;
		const mem = creep.memory;

		//try to set mem['mineralId']
		if (!mem['mineralId']) {
			const minerals = All.mineralsIn(room);
			if (minerals.length > 0) {
				mem['mineralId'] = minerals[0].id;
			}
		}

		const mineral: Mineral|null = Game.getObjectById(mem['mineralId']) || null;
		const container: Container|null = Game.getObjectById(room.memory['mineralContainerId']) || null;

		//harvest || moveTo container
		if (mineral && container) {
			if (creep.pos.isEqualTo(container)) {
				Action.harvest(creep, mineral);
			} else {
				Action.moveTo(creep, container, '#ff00ff');
			}
		} else if (mineral) {
			Action.harvest(creep, mineral);
		}
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		const roomHasExtractor = All.extractorsIn(room).length > 0;
		const roomHasMineralMiner = All.creepsByRoleIn('mineralMiner', room).length > 0;
		const roomHasMineralContainer = !!Game.getObjectById(room.memory['mineralContainerId']);

		const requestSpawn = roomHasExtractor && roomHasMineralContainer && !roomHasMineralMiner;
		if (requestSpawn) {
			const priority = 5;
			return {
				priority: priority,
				generateBody: (energyAvailable: number): string[] => {
					const body: string[] = [];
					const moveCost = Util.costOf([MOVE]);
					const workCost = Util.costOf([WORK]);
					while (energyAvailable >= moveCost || energyAvailable >= workCost) {
						//move
						if (energyAvailable >= moveCost) {
							energyAvailable -= moveCost;
							body.unshift(MOVE);
						}

						//work
						if (energyAvailable >= workCost) {
							energyAvailable -= workCost;
							body.unshift(WORK);
						}

						//work
						if (energyAvailable >= workCost) {
							energyAvailable -= workCost;
							body.unshift(WORK);
						}
					}

					return body;
				},
				memory: {role: 'mineralMiner'}
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