import Log from "util/Log";
import Util from "util/Util";
import Action from "action/Action";
import All from 'All';
import SpawnRequest from 'SpawnRequest';
import Mem from "util/Mem";

export default class MineralMinerLogic {
	static onTick() {
		All.rooms().forEach(room => {
			if (!room.controller || room.controller.level < 6) return; //can't mine minerals yet

			const mineral = All.mineralsIn(room)[0];
			if (mineral) {
				const roomMem = Mem.of(room);

				const extractor = All.extractorsIn(room)[0];
				if (!extractor) {
					const extractorSite = All.constructionSitesIn(room, STRUCTURE_EXTRACTOR)[0];
					if (!extractorSite) {
						room.createConstructionSite(mineral.pos, STRUCTURE_EXTRACTOR);
					}
				}

				const container = Game.getObjectById(roomMem['mineralContainerId']);
				if (!container && mineral.mineralAmount > 0) {
					const containerSitePoint: {x: number, y: number}|undefined = roomMem['mineralContainerSitePoint'];
					if (containerSitePoint) {
						delete roomMem['mineralContainerSitePoint'];

						const containerSitePos = room.getPositionAt(containerSitePoint.x, containerSitePoint.y);
						if (containerSitePos) {
							const containerSite: ConstructionSite|undefined = room.lookForAt(LOOK_CONSTRUCTION_SITES, containerSitePos)[0];
							if (containerSite) {
								roomMem['mineralContainerSiteId'] = containerSite.id;
							}
						}
					}

					const containerSite = Game.getObjectById(roomMem['mineralContainerSiteId']);
					if (!containerSite) {
						if (!roomMem['mineralContainerSiteId']) {
							const pos = placeContainerSite(room, mineral);
							if (pos) {
								//save pos so we can grab container site's id during next tick
								//note: storing pos in memory causes bug where pos != thingInPos.pos in future ticks so store x and y instead
								roomMem['mineralContainerSitePoint'] = {x: pos.x, y: pos.y};
							} else {
								Log.error('MineralMinerLogic::onTick() failed to place mineral container.');
							}
						} else { //just finished building container?
							delete roomMem['mineralContainerSiteId'];

							const newContainer = <StructureContainer>mineral.pos.findInRange(FIND_STRUCTURES, 1, { //not FIND_MY_STRUCTURES
								filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
							})[0];
							if (newContainer) {
								roomMem['mineralContainerId'] = newContainer.id;
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
		if (Action.continue(creep)) return;

		const room = creep.room;
		const roomMem = Mem.of(room);
		const creepMem = Mem.of(creep);

		//try to set creepMem['mineralId']
		if (!creepMem['mineralId']) {
			const minerals = All.mineralsIn(room);
			if (minerals.length > 0) {
				creepMem['mineralId'] = minerals[0].id;
			}
		}

		const mineral: Mineral|null = Game.getObjectById(creepMem['mineralId']) || null;
		const container: StructureContainer|null = Game.getObjectById(roomMem['mineralContainerId']) || null;

		//extract || moveTo container
		if (mineral && container) {
			if (creep.pos.isEqualTo(container)) {
				Action.extract(creep, mineral);
			} else {
				Action.moveToRange(creep, container, '#ff00ff', 0);
			}
		} else if (mineral) {
			Action.extract(creep, mineral);
		}

		Action.continue(creep);
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		const mineral = All.mineralsIn(room)[0];
		const mineralAmount = (mineral)?mineral.mineralAmount:0;
		const roomHasExtractor = All.extractorsIn(room).length > 0;
		const roomHasMineralMiner = All.creepsByRoleIn('mineralMiner', room).length > 0;
		const container: StructureContainer|null = Game.getObjectById(Mem.of(room)['mineralContainerId']) || null;

		const requestSpawn = !roomHasMineralMiner && container && roomHasExtractor && mineralAmount > 0;
		if (requestSpawn) {
			const priority = 5;
			return {
				priority: priority,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
					const body: BodyPartConstant[] = [];
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