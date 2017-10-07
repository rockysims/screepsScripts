import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import HarvestAction from 'action/HarvestAction';
import CollectAction from 'action/CollectAction';
import PickupAction from 'action/PickupAction';
import DeliverAction from 'action/DeliverAction';
import UpgradeAction from 'action/UpgradeAction';
import BuildAction from 'action/BuildAction';
import Continue from 'action/Continue';
import ActionQ from 'action/ActionQ';
import Util from 'util/Util';
import Log from 'util/Log';

export default class Action {
	static continue(creep: Creep): boolean {
		if (creep.memory['inActionContinue']) {
			console.log('!inActionContinue <---------------------------------------------=');
			return true;
		}
		creep.memory['inActionContinue'] = true;

		try {
			creep.memory['actions'] = creep.memory['actions'] || [];
			const actions:AbstractAction[] = creep.memory['actions'];
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
				//console.log(action.type + ' continue() continueAction: ', continueAction);
				if (continueAction) {
					return true;
				} else {
					//actions.splice(actions.indexOf(action), 1); //TODO: delete (or switch back? probably not)
					const actionIndex = actions.indexOf(action);
					actions.splice(actionIndex, actions.length - actionIndex);
				}
			}

			return false;
		} finally {
			creep.memory['inActionContinue'] = false;
		}
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
	static mine(creep: Creep, source: Source) {
		ActionQ.push(creep, new HarvestAction(
			source,
			'#ff0000'
		));
	}

	static collect(creep: Creep, container: Container) {
		ActionQ.push(creep, new CollectAction(
			container
		));
	}

	static pickup(creep: Creep, resource: Resource) {
		ActionQ.push(creep, new PickupAction(
			resource
		));
	}

	static deliver(creep: Creep, structure: Structure) {
		ActionQ.push(creep, new DeliverAction(
			structure
		));
	}

	static upgrade(creep: Creep, controller: Controller) {
		ActionQ.push(creep, new UpgradeAction(
			controller
		));
	}

	static build(creep: Creep, target: ConstructionSite) {
		ActionQ.push(creep, new BuildAction(
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