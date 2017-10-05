import Util from 'util/Util';
import Log from 'util/Log';
import All from 'All';

abstract class AbstractAction {
	type: string;

	constructor(type: string) {
		this.type = type;
	}
}

class MoveToRangeAction extends AbstractAction {
	static type: string = 'moveToRange';
	target: RoomPosition;
	colorCode: string;
	range: number;

	constructor(target: RoomPosition, colorCode: string, range: number) {
		super(MoveToRangeAction.type);
		this.target = target;
		this.colorCode = colorCode;
		this.range = range;
	}

	static run(creep: Creep, action: MoveToRangeAction): boolean {
		console.log('b');
		const at = action.target;
		const pos: RoomPosition = new RoomPosition(at.x, at.y, at.roomName);
		if (!creep.pos.inRangeTo(pos, action.range)) {
			console.log('b if {} start');
			const result: number = creep.moveTo(pos, {
				reusePath: Math.min(Math.ceil(All.creeps().length * 0.4), 5),
				visualizePathStyle: {stroke: action.colorCode}
			});
			if (result == OK) {
				console.log('b ok');
				return true;
			} else if (result == ERR_TIRED) {
				console.log('b tired');
				return true;
			} else {
				creep.say('#' + result + ' ' + MoveToRangeAction.type);
				console.log('b #' + result);
				return false;
			}
		}

		console.log('b end');
		return false;
	}
}

class HarvestAction extends AbstractAction {
	static type: string = 'harvest';
	sourceId: string;
	colorCode: string;

	constructor(source: Source, colorCode: string) {
		super(HarvestAction.type);
		this.sourceId = source.id;
		this.colorCode = colorCode;
	}

	static run(creep: Creep, action: HarvestAction): boolean {
		const source: Source|undefined = Game.getObjectById(action.sourceId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (source
			&& source.energy > 0
			&& (creepEnergy < creep.carryCapacity || creep.carryCapacity == 0)
		) {
			const result: number = creep.harvest(source);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				console.log('HarvestAction::run() calling Action.moveToRange()');
				Action.moveToRange(creep, source, action.colorCode, 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + HarvestAction.type);
				return false;
			}
		}

		return false;
	}
}

class CollectAction extends AbstractAction {
	static type: string = 'collect';
	containerId: string;

	constructor(container: Container) {
		super(CollectAction.type);
		this.containerId = container.id;
	}

	static run(creep: Creep, action: CollectAction): boolean {
		const container: Container|undefined = Game.getObjectById(action.containerId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (container
			&& Util.getEnergy(container) > 0
			&& creepEnergy < creep.carryCapacity
		) {
			const result: number = creep.withdraw(container, RESOURCE_ENERGY);
			if (result == OK) {
				return false; //can withdraw all available at once so done collecting after first success
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, container, '#00ffff', 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + CollectAction.type);
				return false;
			}
		}

		return false;
	}
}

class PickupAction extends AbstractAction {
	static type: string = 'pickup';
	resourceId: string;

	constructor(resource: Resource) {
		super(PickupAction.type);
		this.resourceId = resource.id;
	}

	static run(creep: Creep, action: PickupAction): boolean {
		const resource: Resource|undefined = Game.getObjectById(action.resourceId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (resource && resource.amount > 0 && creepEnergy < creep.carryCapacity) {
			const result: number = creep.pickup(resource);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, resource, '#00ffff', 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + PickupAction.type);
				return false;
			}
		}

		return false;
	}
}

class DeliverAction extends AbstractAction {
	static type: string = 'deliver';
	structureId: string;

	constructor(structure: Structure) {
		super(DeliverAction.type);
		this.structureId = structure.id;
	}

	static run(creep: Creep, action: DeliverAction): boolean {
		const structure: Structure|undefined = Game.getObjectById(action.structureId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (structure && !Util.isFull(structure) && creepEnergy > 0) {
			const result: number = creep.transfer(structure, RESOURCE_ENERGY);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, structure, '#00ff00', 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + DeliverAction.type);
				return false;
			}
		}

		return false;
	}
}

class UpgradeAction extends AbstractAction {
	static type: string = 'upgrade';
	controllerId: string;

	constructor(controller: Controller) {
		super(UpgradeAction.type);
		this.controllerId = controller.id;
	}

	static run(creep: Creep, action: UpgradeAction): boolean {
		const controller: Controller|undefined = Game.getObjectById(action.controllerId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (controller
			&& (controller.level < 8 || controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[controller.level] - 10)
			&& creepEnergy > 0
		) {
			const result: number = creep.upgradeController(controller);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, controller, '#00ff00', 3);
				return true;
			} else {
				creep.say('#' + result + ' ' + UpgradeAction.type);
				return false;
			}
		}

		return false;
	}
}

class BuildAction extends AbstractAction {
	static type: string = 'build';
	constructionSiteId: string;

	constructor(constructionSite: ConstructionSite) {
		super(BuildAction.type);
		this.constructionSiteId = constructionSite.id;
	}

	static run(creep: Creep, action: BuildAction): boolean {
		const constructionSite: ConstructionSite|undefined = Game.getObjectById(action.constructionSiteId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (constructionSite && creepEnergy > 0) {
			const result: number = creep.build(constructionSite);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, constructionSite, '#5555ff', 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + BuildAction.type);
				return false;
			}
		}

		return false;
	}
}

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
				console.log("Executing: " + action.type);
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
	//		console.log("Executing: " + action.type);
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