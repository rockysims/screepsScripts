let util = {
	getCreeps: function() {
		return Object.keys(Game.creeps)
			.map((key) => Game.creeps[key]);
	},
	getCreepsByRole: function(role) {
		return util.getCreeps()
			.filter((creep) => creep.memory.role == role)
	},
	getCreepByRole: function(role) {
		let foundCreep = null;

		for (let creep of Game.creeps) {
			if (creep.memory.role == role) {
				foundCreep = creep;
				break;
			}
		}

		return foundCreep;
	}
};

module.exports = util;