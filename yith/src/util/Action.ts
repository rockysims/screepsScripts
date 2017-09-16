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

	static deliver(creep: Creep, container: Container) {
		let result: number = creep.transfer(container, RESOURCE_ENERGY);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(container, {visualizePathStyle: {stroke: '#0000ff'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static build(creep: Creep, target: ConstructionSite) {
		let result: number = creep.build(target);
		if (result == ERR_NOT_IN_RANGE) {
			creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
		} else if (result != 0) {
			creep.say('#' + result);
		}
	}

	static idle(creep: Creep) {
		creep.say('idle');
		let idleFlag: Flag|{} = creep.room.find(FIND_FLAGS, {
			filter: (flag: Flag) => flag.name == 'Idle1'
		})[0];
		if (idleFlag instanceof Flag) {
			creep.moveTo(idleFlag, {visualizePathStyle: {stroke: '#ff0000'}})
		}

	}
}