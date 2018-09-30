import Log from 'util/Log';
import All from 'All';

export default class Action {
	static moveTo(creep: Creep, target: RoomPosition|{pos: RoomPosition}, colorCode: string|undefined) {
		creep.moveTo(target, {
			reusePath: Math.min(Math.floor(All.creeps().length * 0.4), 5),
			visualizePathStyle: {stroke: colorCode || '#ffffff'}
		});
	}

	static harvest(creep: Creep, target: Source|Mineral) {
		let result: number = creep.harvest(target);
		if (result == ERR_NOT_IN_RANGE) {
			Action.moveTo(creep, target, '#ffff00');
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
		const start = new Date().getTime();
		const energyDrops = All.droppedEnergyIn(creep.room)
			.filter(resource => resource.amount >= creep.carryCapacity * 0.75);
		const containers = All.containersIn(creep.room)
			.filter(container => container.store[RESOURCE_ENERGY] >= creep.carryCapacity * 1);
		const sources = All.sourcesIn(creep.room)
			.filter((source) => source.energy > 0);
		const targets = [];
		targets.push(...sources);
		// if (Math.random() < 0.1) targets.push(...sources);
		targets.push(...containers);
		targets.push(...energyDrops);
		const sortedTargets = targets.sort((a, b) => {
			return b.pos.getRangeTo(creep.pos) - a.pos.getRangeTo(creep.pos);
		});
		let target: any = null; //TODO: find a way to not use the any type
		while (sortedTargets.length > 0 && !target) {
			const closestTarget = sortedTargets.pop();
			if (closestTarget && closestTarget.pos.findClosestByPath([creep])) {
				target = closestTarget;
			}
		}
		if (target) {
			if (target['resourceType']) {
				Action.pickup(creep, target);
			}
			else if (target['ticksToDecay']) {
				Action.collect(creep, target);
			}
			else if (!target['structureType']) {
				Action.harvest(creep, target);
			}
			else {
				Log.error('Action::fillEnergy() target truthy but does not match dropped/container/source at ' + target.pos.x + ', ' + target.pos.y);
			}
		} else {
			creep.say('+energy?');
		}
		console.log('fillEnergy() duration: ', new Date().getTime() - start);

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