export default class Action {
	static harvest(creep: Creep, source: Source) {
		if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
			creep.moveTo(source, {visualizePathStyle: {stroke: '#ffff00'}});
		}
	}

	static collect(creep: Creep, container: Container) {
		if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
			creep.moveTo(container, {visualizePathStyle: {stroke: '#00ffff'}});
		}
	}

	static deliver(creep: Creep, container: Container) {
		if (creep.transfer(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
			creep.moveTo(container, {visualizePathStyle: {stroke: '#0000ff'}});
		}
	}
}