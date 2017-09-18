export default class Action {
	static harvest(creep: Creep, source: Source) {
		let result: number = creep.harvest(source);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(source, {visualizePathStyle: {stroke: '#ffff00'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static collect(creep: Creep, container: Container) {
		let result: number = creep.transfer(container, RESOURCE_ENERGY);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(container, {visualizePathStyle: {stroke: '#00ffff'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static pickup(creep: Creep, resource: Resource) {
		let result: number = creep.pickup(resource);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(resource, {visualizePathStyle: {stroke: '#00ffff'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static deliver(creep: Creep, container: Container) {
		let result: number = creep.transfer(container, RESOURCE_ENERGY);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(container, {visualizePathStyle: {stroke: '#00ff00'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static upgrade(creep: Creep, controller: Controller) {
		let result: number = creep.upgradeController(controller);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(controller, {visualizePathStyle: {stroke: '#00ff00'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static build(creep: Creep, target: ConstructionSite) {
		let result: number = creep.build(target);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(target, {visualizePathStyle: {stroke: '#5555ff'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static moveTo(creep: Creep, target: RoomPosition|{pos: RoomPosition}, colorCode: string|undefined) {
		creep.moveTo(target, {visualizePathStyle: {stroke: colorCode || '#ffffff'}});
	}

	static idle(creep: Creep) {
		creep.say('idle');
		let idleFlag: Flag|{} = creep.room.find(FIND_FLAGS, {
			filter: (flag: Flag) => flag.name == 'Idle1'
		})[0];
		if (idleFlag instanceof Flag) {
			creep.moveTo(idleFlag, {visualizePathStyle: {stroke: '#ff0000'}})
		} else if (creep.room.controller) {
			creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ff0000'}})
		}
	}

	//---//

	static fillEnergy(creep: Creep) {
		let creepEnergy = creep.carry.energy || 0;

		let dropped: Resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
			filter: (resource: Resource) => resource.resourceType == RESOURCE_ENERGY
		});
		let container: Container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
			filter: (structure: Structure) => {
				if (structure.structureType == STRUCTURE_CONTAINER) {
					return (<Container>structure).store >= 0;
				} else {
					return false;
				}
			}
		});
		let source: Source = creep.pos.findClosestByPath(FIND_SOURCES, {
			filter: (source: Source) => source.energy >= 0
		});

		if (dropped) {
			Action.pickup(creep, dropped);
		} else if (container) {
			Action.collect(creep, container);
		} else if (source) {
			Action.harvest(creep, source);
		} else if (creepEnergy > 0) {
			creep.say('+energy?'); //can't find energy
		}

		if (creepEnergy >= creep.carryCapacity) {
			creep.say('full'); //already full
		}
	}
}