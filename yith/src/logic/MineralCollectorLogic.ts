import Util from "util/Util";
import Action from "action/Action";
import All from 'All';
import SpawnRequest from 'SpawnRequest';
import Mem from "util/Mem";

export default class MineralCollectorLogic {
	static onTick() {}

	static run(creep: Creep) {
		if (Action.continue(creep)) return;

		const room = creep.room;
		const mem = Mem.of(creep);
		const creepCarryAmount = Util.usedSpaceIn(creep);

		//consider starting/stopping collecting
		if (!mem['collecting'] && creepCarryAmount == 0) {
			mem['collecting'] = true; //creep is empty so start collecting
			creep.say('collect');
		} else if (mem['collecting'] && creepCarryAmount >= creep.carryCapacity) {
			mem['collecting'] = false; //creep is full so stop collecting
			creep.say('deliver');
		}

		if (mem['collecting']) {
			//pickup
			let actionQueued = false;
			const tombstonesWithMinerals: Tombstone[] = All
				.tombstonesIn(creep.room)
				.filter(tombstone => {
					const mineralsAmount = Util.usedSpaceIn(tombstone) - Util.amountIn(tombstone, RESOURCE_ENERGY);
					return mineralsAmount >= creep.carryCapacity * 0.1;
				});
			if (tombstonesWithMinerals.length > 0) {
				const tombstone = tombstonesWithMinerals[0];
				const resourceType = Util.firstResourceTypeIn(tombstone.store);
				if (resourceType) {
					Action.collect(creep, tombstone, resourceType);
					actionQueued = true;
				}
			} else {
				const mineralDrops: Resource[] = All
					.droppedResourcesIn(room)
					.filter(r => r.resourceType != RESOURCE_ENERGY && r.amount >= creep.carryCapacity * 0.1)
					.sort((a: Resource, b: Resource) => {
						return b.pos.getRangeTo(creep.pos) - a.pos.getRangeTo(creep.pos); //closest first
					});
				if (mineralDrops.length > 0) {
					const mineralDrop = mineralDrops[0];
					Action.pickup(creep, mineralDrop);
					actionQueued = true;
				} else {
					const container: StructureContainer|null = Game.getObjectById(Mem.of(room)['mineralContainerId']) || null;
					if (container) {
						const resourceType = Util.firstResourceTypeIn(container.store);
						if (resourceType) {
							Action.collect(creep, container, resourceType);
							actionQueued = true;
						}
					}
				}
			}

			if (!actionQueued) mem['collecting'] = false; //can't find anything to collect so stop collecting
		} else {
			const target = room.terminal || room.storage;
			if (target) {
				const resourceType = Util.firstResourceTypeIn(creep.carry);
				if (resourceType) {
					Action.deliver(creep, target, resourceType);
				}
			}
		}

		Action.continue(creep);
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		const container: StructureContainer|null = Game.getObjectById(Mem.of(room)['mineralContainerId']) || null;
		const roomHasMineralCollector = All.creepsByRoleIn('mineralCollector', room).length > 0;
		const roomHasMineralMiner = All.creepsByRoleIn('mineralMiner', room).length > 0;

		const requestSpawn = !roomHasMineralCollector && (
			(roomHasMineralMiner && !container)
			|| (container && Util.usedSpaceIn(container) > 0)
		);
		if (requestSpawn) {
			return {
				priority: 5,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
					return Util.generateBodyFromSet([CARRY, MOVE], energyAvailable, 4);
				},
				memory: {role: 'mineralCollector'}
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