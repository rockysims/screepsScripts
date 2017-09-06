let roleHarvester = require('role.harvester');

module.exports.loop = function () {
    var creeps = Game.creeps;
    for (let i in creeps) {
        roleHarvester.run(creeps[i]);
    }
}