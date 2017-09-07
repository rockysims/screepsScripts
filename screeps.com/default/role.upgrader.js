//let util = require('util');
let util = {
	getBestSourceIndex: function(creep) {
		return creep.pos.findClosestByPath(FIND_SOURCES, {
			filter: (source) => source.energy > 0
		});
		creep.room.find(FIND_SOURCES); //
	}
};

//let action = require('action');
let action = {
	fetchEnergy: function(creep) {
		creep.memory.actionFetchEnergy = creep.memory.actionFetchEnergy || {};
		let mem = creep.memory.actionFetchEnergy;
		let done = false;

		if (!mem.sourceIndex) {
			mem.sourceIndex = util.getBestSourceIndex(creep);
		}

		if (!done) {
			if (creep.carry.energy >= creep.carryCapacity) done = true;
		}

		if (!done) {
			let sourceIndex = mem.sourceIndex;
			creep.pos.find
		}


		var source = creep.pos.findClosestByPath(FIND_SOURCES, {
			filter: (source) => source.energy > 0
		});
		if (source) {
			if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
				creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
			}
		} else if (creep.carry.energy > 0) {
			done = true;
		}

		if (done) delete creep.memory.actionFetchEnergy;
		return done;
	}
};


module.exports = {




	runNew: function(creep) {
		let mem = creep.mem;

		if (mem.mode == 'fetchEnergy') {
			let fetchDone = action.fetchEnergy(creep);
			if (fetchDone) mem.mode = 'deliverEnergy';
		}
		if (mem.mode == 'deliverEnergy') {
			let target = creep.room.controller;
			let deliverDone = action.deliverEnergy(creep, target);
			if (deliverDone) mem.mode = 'fetchEnergy';
		}
	},




	/** @param {Creep} creep **/
	run: function(creep) {
		if (creep.memory.upgrading && creep.carry.energy == 0) {
			creep.memory.upgrading = false;
			creep.say('harvest!');
		}
		if (!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
			creep.memory.upgrading = true;
			creep.say('upgrade!');
		}

		if (creep.memory.upgrading) {
			if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
				creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
			}
		}
		else {
			var source = creep.room.find(FIND_SOURCES)[1];
			if (creep.pos.getRangeTo(source) > 1) {
				creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
			} else {
				creep.harvest(source)
			}
		}
	}
};