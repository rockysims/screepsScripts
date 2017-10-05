import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import HarvestAction from 'action/HarvestAction';
import CollectAction from 'action/CollectAction';
import PickupAction from 'action/PickupAction';
import DeliverAction from 'action/DeliverAction';
import UpgradeAction from 'action/UpgradeAction';
import BuildAction from 'action/BuildAction';
import Util from 'util/Util';
import Log from 'util/Log';

//TODO: make all role logic handlers call Action.continue() at the end
//	and make Action.whatever() not call Action.continue()

//TODO: instead of allowing WhateverAction.run() to add actions, make it add via action.subActions.push()
//	then cancel action and all subActions (and sub subActions etc.) if an action fails
//	of course change continue() to execute subActions first
//	hopefully that will solve issue where moveTo fails but parent doesn't so parent just adds moveTo again

//TODO: finish action if target is invalid for some reason
//	reason: mining container no longer has enough energy
//	reason: source out of energy
//	reason: construction site not found
//PROBLEM: how can I cancel subAction task on parent action conditions?
//	maybe parent action is responsible for calling run() on sub action? just a thought

export default class Action {
	static continue(creep: Creep): boolean {
		console.log('a');

		if (creep.memory['inActionContinue']) return true;
		creep.memory['inActionContinue'] = true;

		try {
			creep.memory['actions'] = creep.memory['actions'] || [];
			const actions:AbstractAction[] = creep.memory['actions'];
			//if (true || creep.name == 'Claire')
			console.log(creep.name + ' continue() actions: ', JSON.stringify(actions));
			while (actions.length > 0) {
				const action = actions[actions.length - 1];

				let continueAction = false;
				console.log('Executing: ' + action.type);
				if (action.type == MoveToRangeAction.type)
					continueAction = MoveToRangeAction.run(creep, action as MoveToRangeAction);
				else if (action.type == HarvestAction.type)
					continueAction = HarvestAction.run(creep, action as HarvestAction);
				else if (action.type == CollectAction.type)
					continueAction = CollectAction.run(creep, action as CollectAction);
				else if (action.type == PickupAction.type)
					continueAction = PickupAction.run(creep, action as PickupAction);
				else if (action.type == DeliverAction.type)
					continueAction = DeliverAction.run(creep, action as DeliverAction);
				else if (action.type == UpgradeAction.type)
					continueAction = UpgradeAction.run(creep, action as UpgradeAction);
				else if (action.type == BuildAction.type)
					continueAction = BuildAction.run(creep, action as BuildAction);
				//if (true || creep.name == 'Claire')
				//	console.log(action.type + ' continue() success: ', success);
				if (continueAction) {
					return true;
				} else {
					console.log('finished and removing actions after: ' + action.type);
					//actions.splice(actions.indexOf(action), 1); //TODO: delete (or switch back? probably not)
					console.log('!spliced actions: ', JSON.stringify(actions));
					const actionIndex = actions.indexOf(action);
					actions.splice(actionIndex, actions.length - actionIndex);
					console.log('spliced actions:  ', JSON.stringify(actions));
				}
			}

			console.log('a return false at end');
			return false;
		} finally {
			creep.memory['inActionContinue'] = false;
		}
	}

	//static continue(creep: Creep): boolean {
	//	console.log('a');
	//
	//	creep.memory['actions'] = creep.memory['actions'] || [];
	//	const actions: AbstractAction[] = creep.memory['actions'];
	//	//if (true || creep.name == 'Claire')
	//	//	console.log(creep.name + ' continue() actions: ', JSON.stringify(actions));
	//	while (actions.length > 0) {
	//		const action = actions[actions.length-1];
	//
	//		let success = false;
	//		console.log('Executing: ' + action.type);
	//		if (action.type == MoveToRangeAction.type)
	//			success = MoveToRangeAction.run(creep, action as MoveToRangeAction);
	//		else if (action.type == HarvestAction.type)
	//			success = HarvestAction.run(creep, action as HarvestAction);
	//		else if (action.type == CollectAction.type)
	//			success = CollectAction.run(creep, action as CollectAction);
	//		else if (action.type == PickupAction.type)
	//			success = PickupAction.run(creep, action as PickupAction);
	//		else if (action.type == DeliverAction.type)
	//			success = DeliverAction.run(creep, action as DeliverAction);
	//		else if (action.type == UpgradeAction.type)
	//			success = UpgradeAction.run(creep, action as UpgradeAction);
	//		else if (action.type == BuildAction.type)
	//			success = BuildAction.run(creep, action as BuildAction);
	//		//if (true || creep.name == 'Claire')
	//		//	console.log(action.type + ' continue() success: ', success);
	//		if (!success) {
	//			console.log('action.pop()');
	//			actions.pop();
	//		}
	//		else return true;
	//	}
	//
	//	console.log('a return false at end');
	//	return false;
	//}

	static push(creep: Creep, action: AbstractAction) {
		creep.memory['actions'] = creep.memory['actions'] || [];
		creep.memory['actions'].push(action);
		console.log('push() action: ', JSON.stringify(action));
	}

	static clear(creep: Creep) {
		delete creep.memory['actions'];
	}

	//---//

	static moveToRange(creep: Creep, target: RoomPosition|{pos: RoomPosition}, colorCode: string, range: number) {
		console.log('c');

		console.log('-- no trace');
		//console.log('stack trace: ', (new Error()).stack);


		Action.push(creep, new MoveToRangeAction(
			Util.posOf(target),
			colorCode,
			range
		));
		Action.continue(creep);
	}

	static harvest(creep: Creep, source: Source) {
		console.log('Action.harvest() called');
		Action.push(creep, new HarvestAction(
			source,
			'#ffff00'
		));
		Action.continue(creep);
	}

	//harvest alias (with different path color)
	static mine(creep: Creep, source: Source) {
		console.log('Action.mine() called');
		Action.push(creep, new HarvestAction(
			source,
			'#ff0000'
		));
		Action.continue(creep);
	}

	static collect(creep: Creep, container: Container) {
		Action.push(creep, new CollectAction(
			container
		));
		Action.continue(creep);
	}

	static pickup(creep: Creep, resource: Resource) {
		Action.push(creep, new PickupAction(
			resource
		));
		Action.continue(creep);
	}

	static deliver(creep: Creep, structure: Structure) {
		Action.push(creep, new DeliverAction(
			structure
		));
		Action.continue(creep);
	}

	static upgrade(creep: Creep, controller: Controller) {
		Action.push(creep, new UpgradeAction(
			controller
		));
		Action.continue(creep);
	}

	static build(creep: Creep, target: ConstructionSite) {
		Action.push(creep, new BuildAction(
			target
		));
		Action.continue(creep);
	}

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
		const targets: (Resource|Container|Source)[] = [];

		//targets += energy drops
		targets.push(... creep.room.find(FIND_DROPPED_RESOURCES, {
			filter: (resource: Resource) =>
			resource.resourceType == RESOURCE_ENERGY
			&& resource.amount >= creep.carryCapacity * 0.75
		}) as Resource[]);

		//targets += containers
		targets.push(... creep.room.find(FIND_STRUCTURES, {
			filter: (structure: Structure) => {
				if (structure.structureType == STRUCTURE_CONTAINER) {
					return (<Container>structure).store[RESOURCE_ENERGY] >= creep.carryCapacity / 2;
				} else {
					return false;
				}
			}
		}) as Container[]);

		//targets += sources
		targets.push(... creep.room.find(FIND_SOURCES, {
			filter: (source: Source) => source.energy > 0
		}) as Source[]);

		const target: Resource|Container|Source = creep.pos.findClosestByPath(targets);
		if (target) {
			if ((target as any)['resourceType']) {
				Action.pickup(creep, target as Resource);
			} else if ((target as any)['ticksToDecay']) {
				Action.collect(creep, target as Container);
			} else if (!(target as any)['structureType']) {
				Action.harvest(creep, target as Source);
			} else {
				Log.error('Action::fillEnergy() target truthy but does not match dropped/container/source at ' + target.pos.x + ', ' + target.pos.y);
			}
		} else {
			creep.say('+energy?'); //can't find energy
		}

		//TODO: sort options by range multiplied by
		//	drops: *1
		//	containers: *2
		//	storages: *2
		//	sources: *4

		//TODO: make choice sticky until done or can't do
		//	save in creep.memory.fillEnergyTargetId?
		//	example of can't do: no path to target
	}

	static emptyEnergy(creep: Creep) {
		let target: Structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
			filter: (structure: Structure) => {
				return (structure.structureType == STRUCTURE_EXTENSION
						|| structure.structureType == STRUCTURE_SPAWN
					) &&
					(<Extension|Spawn>structure).energy < (<Extension|Spawn>structure).energyCapacity;
			}
		});
		target = target || creep.pos.findClosestByPath(FIND_STRUCTURES, {
				filter: (structure: Structure) => {
					return (structure.structureType == STRUCTURE_CONTAINER
							|| structure.structureType == STRUCTURE_STORAGE
						) && !Util.isFull(structure);
				}
			});
		let roomCtrl: Controller|undefined = creep.room.controller;
		if (roomCtrl && roomCtrl.level >= 8 && roomCtrl.ticksToDowngrade > 1000) {
			roomCtrl = undefined;
		}

		if (target) Action.deliver(creep, target);
		else if (roomCtrl) Action.upgrade(creep, roomCtrl);
		else Action.idle(creep);
	}
}