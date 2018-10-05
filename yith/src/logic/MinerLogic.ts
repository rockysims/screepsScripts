import Log from 'util/Log';
import Util from 'util/Util';
import Action from 'action/Action';
import All from 'All';
import SpawnRequest from 'SpawnRequest';
import Store from 'util/Store';
import Mem from "util/Mem";
import ActionQ from "action/ActionQ";

export default class MinerLogic {
	static onTick() {}

	static run(creep: Creep) {
		const mem = Mem.of(creep);
		if (Game.time % 10 == 0
			&& !Game.getObjectById(mem['targetId'])
			&& !Game.getObjectById(mem['targetSiteId'])
		) {
			ActionQ.clear(creep);
		} else {
			if (Action.continue(creep)) return;
		}

		//try to set mem['sourceId'] && source
		if (!mem['sourceId']) {
			const minersInRoom: Creep[] = All.creepsByRoleIn('miner', creep.room);

			//fill unclaimedSources (excluding sources with miner already)
			const sources: Source[] = creep.room.find(FIND_SOURCES);
			const unclaimedSources: Source[] = [];
			sources.forEach((source) => {
				const sourceClaimed = minersInRoom.some(miner => Mem.of(miner)['sourceId'] == source.id);
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
				const targets = source.pos.findInRange(FIND_STRUCTURES, 1, { //not FIND_MY_STRUCTURES and not range 0
					filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
				}) as StructureContainer[];

				//fix for bug where onContainerBuilt places 2 containers (seems to be bug in screeps?)
				//	seems to be fixed now so commenting it out
				// console.log('targets: ', targets);
				// while (targets.length > 1) {
				// 	const t = targets.pop();
				// 	if (t) t.destroy();
				// }
				// console.log('after pop()s. targets: ', targets);

				const target = targets[0];
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
							const maxContainers = Util.maxStructureCountIn(STRUCTURE_CONTAINER, creep.room);
							const containerCount = All.containersIn(creep.room).length;
							const constructingContainerCount = All.constructionSitesIn(creep.room, STRUCTURE_CONTAINER).length;
							console.log('[maxContainers,containerCount,constructingContainerCount]: ',
								[maxContainers,containerCount,constructingContainerCount]);
							if (containerCount + constructingContainerCount < maxContainers) {
								placeMinerContainerForSourceNear(source, spawn.pos);
							}
							else console.log('!place because count >= maxContainers');

							//TODO: fix bug where after first container all others get build without waiting (maybe fixed now?)

						}
					}
				}
			}
		}
		const target: Structure|undefined = Game.getObjectById(mem['targetId']) || undefined;

		//harvest || moveToRange target
		if (source && target) {
			if (creep.pos.isEqualTo(target)) {
				Action.mine(creep, source);
			} else {
				Action.moveToRange(creep, target, '#ff00ff', 0);
			}
		} else if (source) {
			Action.mine(creep, source);
		}

		Action.continue(creep);

		//////////////////////////////////

		function placeMinerContainerForSourceNear(source: Source, pos: RoomPosition) {
			const tilesBySource: RoomPosition[] = Util
				.getAdjacent8(source)
				.filter((pos: RoomPosition) => Util.isBuildable([pos]))
				.sort((a: RoomPosition, b: RoomPosition) => Math.abs(b.x - pos.x) - Math.abs(a.x - pos.x)) //closest to source on x axis first
				.sort((a: RoomPosition, b: RoomPosition) => Math.abs(b.y - pos.y) - Math.abs(a.y - pos.y)) //closest to source on y axis first
				.sort((a: RoomPosition, b: RoomPosition) => a.getRangeTo(source) - b.getRangeTo(source)); //lowest range first
			console.log('tilesBySource: ', tilesBySource);
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
			const fullMinerCost = Util.costOf([WORK, WORK, WORK, WORK, WORK, MOVE]);
			const priority = (fullMinerCost <= room.energyCapacityAvailable)
				? Math.max(4, 7 - minerCount * 0.5)
				: (minerCount <= 1)?5:0;  //start up phase
			return {
				priority: priority,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
					const body: BodyPartConstant[] = [MOVE];
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