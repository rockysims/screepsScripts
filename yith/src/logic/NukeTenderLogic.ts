import Util from "util/Util";
import Action from "action/Action";
import All from 'All';
import SpawnRequest from 'SpawnRequest';
import Mem from "util/Mem";

export default class NukeTenderLogic {
	static onTick() {}

	static run(creep: Creep) {
		if (Action.continue(creep)) return;

		const room = creep.room;
		const mem = Mem.of(creep);
		const creepCarryAmount = Util.usedSpaceIn(creep);
		const nuker = All.nukerIn(room);
		const nukerGhodiumSpace = (nuker)
			? Util.freeSpaceIn(nuker, RESOURCE_GHODIUM)
			: 0;

		if (!nuker) {
			Action.idle(creep);
		} else if (nukerGhodiumSpace <= 0) {
			const target = room.terminal || room.storage || All.spawnsIn(room)[0];
			if (target && !creep.pos.inRangeTo(target, 1)) {
				Action.moveToRange(creep, target, '#ff00ff', 1);
			} else {
				creep.suicide();
			}
		} else {
			//consider starting/stopping collecting
			if (!mem['collecting'] && creepCarryAmount == 0) {
				mem['collecting'] = true; //creep is empty so start collecting
				creep.say('collect');
			} else if (mem['collecting'] && creepCarryAmount >= Math.min(creep.carryCapacity, nukerGhodiumSpace)) {
				mem['collecting'] = false; //creep is full so stop collecting
				creep.say('deliver');
			}

			if (mem['collecting']) {
				//pickup
				let actionQueued = false;
				const ghodiumDrops: Resource[] = All
					.droppedResourcesIn(room)
					.filter(r => r.resourceType === RESOURCE_GHODIUM && r.amount >= creep.carryCapacity * 0.1)
					.sort((a: Resource, b: Resource) => {
						return b.pos.getRangeTo(creep.pos) - a.pos.getRangeTo(creep.pos); //closest first
					});
				if (ghodiumDrops.length > 0) {
					const ghodiumDrop = ghodiumDrops[0];
					Action.pickup(creep, ghodiumDrop);
					actionQueued = true;
				} else {
					const target = room.storage || room.terminal;
					if (target && Util.amountIn(target, RESOURCE_GHODIUM) > 0) {
						Action.collect(creep, target, RESOURCE_GHODIUM, nukerGhodiumSpace);
						actionQueued = true;
					}
				}

				if (!actionQueued) mem['collecting'] = false; //can't find anything to collect so stop collecting
			} else {
				//deliver
				Action.deliver(creep, nuker, RESOURCE_GHODIUM);
			}
		}

		Action.continue(creep);
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		const nuker = All.nukerIn(room);
		const roomHasNukeTender = All.creepsByRoleIn('nukeTender', room, true).length > 0;

		const requestSpawn = nuker && Util.freeSpaceIn(nuker, RESOURCE_GHODIUM) > 0 && !roomHasNukeTender;
		if (requestSpawn) {
			return {
				priority: 3,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
					return Util.generateBodyFromSet([CARRY, MOVE], energyAvailable, 4);
				},
				memory: {role: 'nukeTender'}
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