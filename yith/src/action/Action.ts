import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import HarvestAction from 'action/HarvestAction';
import ExtractAction from 'action/ExtractAction';
import CollectAction from 'action/CollectAction';
import PickupAction from 'action/PickupAction';
import DeliverAction from 'action/DeliverAction';
import UpgradeAction from 'action/UpgradeAction';
import BuildAction from 'action/BuildAction';
import AttackAction from "action/AttackAction";
import HealAction from "action/HealAction";
import ActionQ from 'action/ActionQ';
import Util from 'util/Util';
import Log from 'util/Log';
import All from 'All';
import Mem from "util/Mem";

export default class Action {
	static continue(creep: Creep): boolean|number {
		const creepMem = Mem.of(creep);
		if (creepMem['inActionContinue']) {
			Log.log('!inActionContinue <---------------------------------------------=');
			return true;
		}
		creepMem['inActionContinue'] = true;

		try {
			creepMem['actions'] = creepMem['actions'] || [];
			const actions: AbstractAction[] = creepMem['actions'];

			//console.log(creep.name + ' continue() actions: ', JSON.stringify(actions));
			let loopLimit = 10;
			while (actions.length > 0 && loopLimit-- > 0) {
				const action = actions[actions.length - 1];
				let actionResult: boolean|number = false;
				//console.log('Executing: ' + action.type);
				if (action.type == MoveToRangeAction.type)
					actionResult = MoveToRangeAction.run(creep, action as MoveToRangeAction);
				else if (action.type == HarvestAction.type)
					actionResult = HarvestAction.run(creep, action as HarvestAction);
				else if (action.type == ExtractAction.type)
					actionResult = ExtractAction.run(creep, action as ExtractAction);
				else if (action.type == CollectAction.type)
					actionResult = CollectAction.run(creep, action as CollectAction);
				else if (action.type == PickupAction.type)
					actionResult = PickupAction.run(creep, action as PickupAction);
				else if (action.type == DeliverAction.type)
					actionResult = DeliverAction.run(creep, action as DeliverAction);
				else if (action.type == UpgradeAction.type)
					actionResult = UpgradeAction.run(creep, action as UpgradeAction);
				else if (action.type == BuildAction.type)
					actionResult = BuildAction.run(creep, action as BuildAction);
				else if (action.type == AttackAction.type)
					actionResult = AttackAction.run(creep, action as AttackAction);
				else if (action.type == HealAction.type)
					actionResult = HealAction.run(creep, action as HealAction);

				if (actionResult == true) return true; //continued action
				else if (actionResult == false) actions.pop(); //already finished action
				else { //failed to execute action
					actions.pop();
					Log.log(creep.name + ' failed to ' + action.type + '. actionResult: ' + actionResult
						+ '                                                           ' +' <------------ action error');

					if (actionResult == ERR_NO_BODYPART) {
						//probably damaged so for now just suicide (later maybe wait for healer creep?)
						//TODO: go back to spawn first then suicide
						creep.suicide();
						Log.warn(creepMem['role'] + ' ' + creep.name + ' suicide() from Action::continue() due to ERR_NO_BODYPART (-12)');
					}
				}
			}

			if (loopLimit <= 0) Log.error('Action::continue() exhausted loopLimit! <--------------------------');

			return false;
		} finally {
			creepMem['inActionContinue'] = false;
		}
	}

	static clear(creep: Creep) {
		ActionQ.clear(creep);
	}

	//---//

	static moveToRange(creep: Creep, target: RoomPosition|{pos: RoomPosition}, colorCode: string, range: number) {
		ActionQ.push(creep, new MoveToRangeAction(
			Util.posOf(target),
			colorCode,
			range
		));
	}

	static harvest(creep: Creep, source: Source) {
		ActionQ.push(creep, new HarvestAction(
			source,
			'#ffff00'
		));
	}

	//harvest alias (with different path color)
	static mine(creep: Creep, target: Source) {
		ActionQ.push(creep, new HarvestAction(
			target,
			'#ff0000'
		));
	}

	static extract(creep: Creep, mineral: Mineral) {
		ActionQ.push(creep, new ExtractAction(
			mineral,
			'#ffff00'
		));
	}

	static collect(creep: Creep, container: StructureContainer|Tombstone, resourceType: ResourceConstant) {
		ActionQ.push(creep, new CollectAction(
			container, resourceType
		));
	}

	static pickup(creep: Creep, resource: Resource) {
		ActionQ.push(creep, new PickupAction(
			resource
		));
	}

	static deliver(creep: Creep, structure: Structure, resourceType: ResourceConstant) {
		ActionQ.push(creep, new DeliverAction(
			structure, resourceType
		));
	}

	static upgrade(creep: Creep, controller: StructureController) {
		ActionQ.push(creep, new UpgradeAction(
			controller
		));
	}

	static build(creep: Creep, target: ConstructionSite) {
		ActionQ.push(creep, new BuildAction(
			target
		));
	}

	static attack(creep: Creep, target: Structure|Creep) {
		ActionQ.push(creep, new AttackAction(
			target
		));
	}

	static heal(creep: Creep, target: Creep) {
		ActionQ.push(creep, new HealAction(
			target
		));
	}

	//---//

	//TODO: consider writing IdleAction.ts (for the sake of consistency)
	static idle(creep: Creep) {
		creep.say('idle');
		if (creep.room.controller) {
			creep.moveTo(creep.room.controller, {
				visualizePathStyle: {stroke: '#ff0000'}
			});
		}
	}

	//---//

	static fillEnergy(creep: Creep) {
		// const start = new Date().getTime();

		//console.log('fillEnergy() duration A: ', new Date().getTime() - start);

		const tombstonesWithEnergy: Tombstone[] = All
			.tombstonesIn(creep.room)
			.filter(tombstone => tombstone.store[RESOURCE_ENERGY] >= creep.carryCapacity * 0.75);

		const energyDrops: Resource[] = All
			.droppedEnergyIn(creep.room)
			.filter(resource => resource.amount >= creep.carryCapacity * 0.75);

		const containers: StructureContainer[] = All
			.containersIn(creep.room)
			.filter(container => container.store[RESOURCE_ENERGY] >= creep.carryCapacity / 2);

		const sources: Source[] = All
			.sourcesIn(creep.room)
			.filter((source: Source) => source.energy > 0);

		const targets: (Tombstone|Resource|StructureContainer|Source)[] = [];
		targets.push(... tombstonesWithEnergy);
		if (targets.length == 0) targets.push(... energyDrops);
		if (targets.length == 0) targets.push(... containers);
		if (targets.length == 0) targets.push(... sources);

		//sort targets (lowest range last)
		const sortedTargets = targets.sort((a: (Tombstone|Resource|StructureContainer|Source), b: (Tombstone|Resource|StructureContainer|Source)) => {
			return b.pos.getRangeTo(creep.pos) - a.pos.getRangeTo(creep.pos)
		});

		//console.log('fillEnergy() duration B: ', new Date().getTime() - start);

		let target: Tombstone|Resource|StructureContainer|Source|undefined;
		while (sortedTargets.length > 0 && !target) {
			const closestTarget = sortedTargets.pop();
			//find path from target to creep (not vic-versa) so that surrounded targets fail fast
			if (closestTarget && closestTarget.pos.findClosestByPath([creep])) {
				target = closestTarget;
			}
			//console.log('fillEnergy() duration C: ', new Date().getTime() - start);
		}

		//console.log('fillEnergy() duration D: ', new Date().getTime() - start);
		if (target) {
			//console.log('fillEnergy() duration E: ', new Date().getTime() - start);
			if ((target as any)['deathTime']) {
				Action.collect(creep, target as Tombstone, RESOURCE_ENERGY);
			} else if ((target as any)['resourceType']) {
				Action.pickup(creep, target as Resource);
			} else if ((target as any)['ticksToDecay']) {
				Action.collect(creep, target as StructureContainer, RESOURCE_ENERGY);
			} else if (!(target as any)['structureType']) {
				Action.harvest(creep, target as Source);
			} else {
				Log.error('Action::fillEnergy() target truthy but does not match tombstone/dropped/container/source at ' + target.pos.x + ', ' + target.pos.y);
			}
			//console.log('fillEnergy() duration F: ', new Date().getTime() - start);
		} else {
			creep.say('+energy?'); //can't find energy
		}

		//TODO: sort options by range multiplied by
		//	drops: *1
		//	containers: *2
		//	storages: *2
		//	sources: *8

		// console.log('fillEnergy() duration: ', new Date().getTime() - start);
	}

	static emptyEnergy(creep: Creep) {
		let target: Structure|null = creep.pos.findClosestByPath(FIND_STRUCTURES, {
			filter: (structure: Structure) => {
				return (structure.structureType == STRUCTURE_EXTENSION
						|| structure.structureType == STRUCTURE_SPAWN
					) &&
					(<StructureExtension|StructureSpawn>structure).energy < (<StructureExtension|StructureSpawn>structure).energyCapacity;
			}
		});
		target = target || creep.pos.findClosestByPath(FIND_STRUCTURES, {
				filter: (structure: Structure) => {
					return (structure.structureType == STRUCTURE_CONTAINER
							|| structure.structureType == STRUCTURE_TERMINAL
							|| structure.structureType == STRUCTURE_STORAGE
						) && !Util.isFull(structure, RESOURCE_ENERGY);
				}
			});
		let roomCtrl: StructureController|undefined = creep.room.controller;
		if (roomCtrl && roomCtrl.level >= 8 && roomCtrl.ticksToDowngrade > 1000) {
			roomCtrl = undefined;
		}

		if (target) Action.deliver(creep, target, RESOURCE_ENERGY);
		else if (roomCtrl) Action.upgrade(creep, roomCtrl);
		else Action.idle(creep);
	}
}