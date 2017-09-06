module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {
	    let returnMode = creep.carry.energy >= creep.carryCapacity;
        if (returnMode) {
            let spawn = Game.spawns['Spawn1'];
            transferOrMove(creep, spawn, RESOURCE_ENERGY);
        } else {
            let source = creep.room.find(FIND_SOURCES)[0];
            harvestOrMove(creep, source);
        }
	}
};

function transferOrMove(creep, target, resourceType) {
    if (creep.transfer(target, resourceType) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);
    }
}

function harvestOrMove(creep, target) {
    if (creep.harvest(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);
    }
}