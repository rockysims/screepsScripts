module.exports = {
	/** @param {Creep} creep **/
	run: function(creep) {
		let isFull = creep.carry.energy >= creep.carryCapacity;
		let isEmpty = creep.carry.energy <= 0;
		let mem = creep.memory;
		if (isFull && mem.isHarvesting) {
			mem.isHarvesting = false;
			creep.say('build');
		}
		if (isEmpty && !mem.isHarvesting) {
			mem.isHarvesting = true;
			mem.sourceIndex = getRandomSourceIndex(creep);
			creep.say('harvest');
		}

		if (mem.isHarvesting) {
			var source = creep.room.find(FIND_SOURCES)[mem.sourceIndex || 0];
			let harvestResult = creep.harvest(source);
			if (harvestResult == ERR_NOT_IN_RANGE) {
				creep.moveTo(source, {visualizePathStyle: {stroke: '#ffff00'}});
			} else if (harvestResult == ERR_NOT_ENOUGH_RESOURCES && creep.carry.energy > 0) {
				mem.isHarvesting = false;
			}
		} else {
			let target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
			if (target) {
				if (creep.build(target) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
				}
			} else {
				creep.moveTo(Game.flags['Idle1'], {visualizePathStyle: {stroke: '#ff0000'}})
			}
		}
	}
};

function getRandomSourceIndex(creep) {
	let sources = creep.room.find(FIND_SOURCES);
	return getRandomInt(0, sources.length);
}
function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}