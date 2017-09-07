module.exports = {

	/** @param {Creep} creep **/
	run: function(creep) {
		let isFull = creep.carry.energy >= creep.carryCapacity;
		let isEmpty = creep.carry.energy <= 0;
		let mem = creep.memory;
		if (isFull && mem.isHarvesting) mem.isHarvesting = false;
		if (isEmpty && !mem.isHarvesting) mem.isHarvesting = true;

		if (mem.isHarvesting) {
			var source = creep.pos.findClosestByRange(FIND_SOURCES, {
				filter: (source) => source.energy > 0
			});
			if (source) {
				if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
					creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
				}
			} else if (creep.carry.energy > 0) {
				mem.isHarvesting = false;
			}
		} else {
			let target = null;

			if (!target) {
				let targets = creep.room.find(FIND_STRUCTURES, {
					filter: (structure) => {
						return (structure.structureType == STRUCTURE_EXTENSION
								|| structure.structureType == STRUCTURE_SPAWN
							) &&
							structure.energy < structure.energyCapacity;
					}
				});
				target = creep.pos.findClosestByPath(targets);
			}

			if (!target) {
				let targets = creep.room.find(FIND_STRUCTURES, {
					filter: (structure) => {
						return structure.structureType == STRUCTURE_TOWER
							&& structure.energy < structure.energyCapacity;
					}
				});
				targets.sort((a, b) => a.energy - b.energy); //lowest first
				target = targets[0];
			}

			if (target) {
				if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
				}
			} else {
				creep.moveTo(Game.flags['Idle1'], {visualizePathStyle: {stroke: '#ff0000'}})
			}
		}
	}
};