let roleHarvester = require('role.harvester');
let roleUpgrader = require('role.upgrader');
let roleBuilder = require('role.builder');

let desiredCountByRole = {
	'harvester': 3,
	'upgrader': 8,
	'builder': 3
};

let newCreepBody = [
	WORK, WORK, WORK, //300
	CARRY, CARRY, CARRY, //150
	MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE //350
];

module.exports.loop = function () {
	Object.keys(Memory.creeps).forEach((name) => {
		if (!Game.creeps[name]) {
			console.log('Clearing non-existing creep memory: ' + name + ' (' + Memory.creeps[name].role + ')');
			delete Memory.creeps[name];
		}
	});

	tryToFillRoleQuotas(desiredCountByRole);

	//tick creeps
	for (let name in Game.creeps) {
		var creep = Game.creeps[name];
		if (creep.memory.role == 'harvester') {
			roleHarvester.run(creep);
		}
		if (creep.memory.role == 'upgrader') {
			roleUpgrader.run(creep);
		}
		if (creep.memory.role == 'builder') {
			roleBuilder.run(creep);
		}
	}

	//tick towers
	for (let roomKey in Game.rooms) {
		let room = Game.rooms[roomKey];
		var towers = room.find(
			FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}
		);
		for (let towerKey in towers) {
			let tower = towers[towerKey];
			if (tower.energy > tower.energyCapacity - 250) {
				let damagedStructures = tower.pos.findInRange(FIND_STRUCTURES, 10, {
					filter: (structure) => structure.hits < structure.hitsMax
				});
				damagedStructures.sort((a, b) => a.hits > b.hits); //lowest first
				let damagedStructure = damagedStructures[0];
				if(damagedStructure) {
					tower.repair(damagedStructure);
				}
			}

			var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
			if(closestHostile) {
				tower.attack(closestHostile);
			}
		}
	}
};

function getExtraCreepsByRole(role) {
	return Object.keys(Game.creeps)
		.map((key) => Game.creeps[key])
		.filter((creep) => creep.memory.role == role)
		.slice(desiredCountByRole[role]);
}

function tryToFillRoleQuotas() {
	let realDesiredCountByRole = {};
	Object.keys(desiredCountByRole).forEach(role => {
		realDesiredCountByRole[role] = desiredCountByRole[role]
	});

	//count creeps of each role
	let countByRole = {};
	Object.keys(realDesiredCountByRole).forEach((role) => {
		countByRole[role] = 0;
	});
	Object.keys(Game.creeps)
		.map((key) => Game.creeps[key])
		.forEach((creep) => {
			let role = creep.memory.role;
			countByRole[role]++;
		});



	let someCreep = Game.creeps[Object.keys(Game.creeps)[0]];
	let constructions = someCreep.room.find(FIND_CONSTRUCTION_SITES);
	if (constructions.length <= 0) {
		realDesiredCountByRole.builder = 0;
		Object.keys(Game.creeps)
			.map((key) => Game.creeps[key])
			.filter((creep) => creep.memory.role == 'builder')
			.forEach((creep) => creep.memory.role = 'upgrader');
	}



	console.log('-----------------');
	Object.keys(realDesiredCountByRole).forEach((role) => {
		console.log('countByRole['+role+']: ' + countByRole[role] + ' ?< ' + realDesiredCountByRole[role]);
	});

	//get extra creeps
	let extraCreeps = [];
	Object.keys(realDesiredCountByRole).forEach((role) => {
		getExtraCreepsByRole(role).forEach(function(extraCreep) {
			extraCreeps.push(extraCreep);
		});
	});
	console.log('extraCreeps: ', extraCreeps.length);

	//re-assign extra creeps (prioritize roles with 0 first)
	Object.keys(realDesiredCountByRole).forEach((role) => {
		if (countByRole[role] <= 0 && realDesiredCountByRole[role] > 0) {
			let extraCreep = extraCreeps.pop();
			if (extraCreep) {
				extraCreep.memory.role = role;
				countByRole[role]++;
			}
		}
	});

	//re-assign extra creeps
	extraCreeps.forEach((extraCreep) => {
		Object.keys(realDesiredCountByRole).forEach((role) => {
			if (countByRole[role] < realDesiredCountByRole[role]) {
				extraCreep.memory.role = role;
				countByRole[role]++;
			}
		});
	});

	//consider spawning creep
	Object.keys(realDesiredCountByRole).some((role) => {
		if (countByRole[role] < realDesiredCountByRole[role]) {
			console.log('attempting to spawn');
			Game.spawns['Spawn1'].createCreep(newCreepBody, null, {role: role});
			return true;
		}
	});
}