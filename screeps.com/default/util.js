let util = {
	getCreepByRole: function(role) {
		let creep = null;

		for (let i in Game.creeps) {
			let c = Game.creeps[i];
			if (c.memory.role == role) {
				creep = c;
				break;
			}
		}

		return creep;
	},
	getCreepsByRole: function(role) {
		return util.getCreeps()
			.filter((creep) => creep.memory.role == role)
	},
	getCreeps: function() {
		return Object.keys(Game.creeps)
			.map((key) => Game.creeps[key]);

	}
};

module.exports = util;