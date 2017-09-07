require('creepExtensions')();
let util = require('util');

module.exports.loop = function () {
	if (Game.time % 5 == 0) {
		console.log(Game.time + ' =================');
		Object.keys(Memory.creeps).forEach((name) => {
			if (!Game.creeps[name]) {
				console.log('Clearing non-existing creep memory: ' + name + ' (' + Memory.creeps[name].role + ')');
				delete Memory.creeps[name];
			}
		});
	}

	util.getCreeps().forEach(c => c.doThat());


};