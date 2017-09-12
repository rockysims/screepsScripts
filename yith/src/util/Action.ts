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
}