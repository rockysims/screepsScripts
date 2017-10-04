import Log from 'util/Log';
import All from 'All';

export default class Action {
	static moveTo(creep: Creep, target: RoomPosition|{pos: RoomPosition}, colorCode: string|undefined) {
		creep.moveTo(target, {
			reusePath: Math.min(Math.floor(All.creeps().length * 0.4), 5),
			visualizePathStyle: {stroke: colorCode || '#ffffff'}
		});
	}

	static harvest(creep: Creep, source: Source) {
		let result: number = creep.harvest(source);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, source, '#ffff00');
		} else if (result != 0) {
			creep.say('#' + result + ' harvest');
		}
	}

	static collect(creep: Creep, container: Container) {
		let result: number = creep.withdraw(container, RESOURCE_ENERGY);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, container, '#00ffff');
		} else if (result != 0) {
			creep.say('#' + result + ' collect');
		}
	}

	static pickup(creep: Creep, resource: Resource) {
		let result: number = creep.pickup(resource);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, resource, '#00ffff');
		} else if (result != 0) {
			creep.say('#' + result + ' pickup');
		}
	}

	static deliver(creep: Creep, structure: Structure) {
		let result: number = creep.transfer(structure, RESOURCE_ENERGY);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, structure, '#00ff00');
		} else if (result != 0) {
			creep.say('#' + result + ' deliver');
		}
	}

	static upgrade(creep: Creep, controller: Controller) {
		let result: number = creep.upgradeController(controller);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, controller, '#00ff00');
		} else if (result != 0) {
			creep.say('#' + result + ' upgrade');
		}
	}

	static build(creep: Creep, target: ConstructionSite) {
		let result: number = creep.build(target);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, target, '#5555ff');
		} else if (result != 0) {
			creep.say('#' + result + ' build');
		}
	}

	static idle(creep: Creep) {
		creep.say('idle');
		let idleFlag: Flag|{} = creep.room.find(FIND_FLAGS, {
			filter: (flag: Flag) => flag.name == 'Idle1'
		})[0];
		if (idleFlag instanceof Flag) {
			Action.moveTo(creep, idleFlag, '#ff0000');
		} else if (creep.room.controller) {
			Action.moveTo(creep, creep.room.controller, '#ff0000');
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
		//	containers: *4
		//	storages: *4
		//	sources: *8

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
						) &&
						(<Container|Storage>structure).store < (<Container|Storage>structure).storeCapacity;
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