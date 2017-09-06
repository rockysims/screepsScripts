let roleHarvester = require('role.harvester');
let roleUpgrader = require('role.upgrader');
let roleBuilder = require('role.builder');
let util = require('util');

let desiredCountByRole = {
	'harvester': 3,
	'upgrader': 7,
	'builder': 3
};

let newCreepBody = [
	WORK, WORK, WORK, //300
	CARRY, CARRY, CARRY, //150
	MOVE, MOVE, MOVE, MOVE, MOVE, MOVE //300
];

module.exports.loop = function () {
	log5(Game.time + ' -----------------');

	Object.keys(Memory.creeps).forEach((name) => {
		if (!Game.creeps[name]) {
			console.log('Clearing non-existing creep memory: ' + name + ' (' + Memory.creeps[name].role + ')');
			delete Memory.creeps[name];
		}
	});

	log5('Memory.attackCount: ' + Memory.attackCount);

	tryToFillRoleQuotas(desiredCountByRole);
	//balanceRoles(desiredCountByRole);

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
			let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
			if (closestHostile) {
				tower.attack(closestHostile);
				Memory.attackCount = (Memory.attackCount || 0) + 1;
			} else {
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
			}
		}
	}
};

function getExtraCreepsByRole(role) {
	return util.getCreepsByRole(role)
		.slice(desiredCountByRole[role]);
}

function tryToFillRoleQuotas() {
	let allRoles = Object.keys(desiredCountByRole);
	let allCreeps = util.getCreeps();
	let realDesiredCountByRole = {};
	allRoles.forEach(role => {
		realDesiredCountByRole[role] = desiredCountByRole[role]
	});

	//count creeps of each role
	let countByRole = {};
	allRoles.forEach((role) => {
		countByRole[role] = 0;
	});
	allCreeps.forEach((creep) => {
		countByRole[creep.memory.role]++;
	});

	let room = allCreeps[0].room;
	let constructions = room.find(FIND_CONSTRUCTION_SITES);
	if (constructions.length <= 0) {
		realDesiredCountByRole.upgrader += realDesiredCountByRole.builder;
		realDesiredCountByRole.builder = 0;
		util.getCreepsByRole('builder')
			.forEach((creep) => reassignCreep(creep, 'upgrader'));
	}

	//get extra creeps
	let extraCreeps = [];
	allRoles.forEach((role) => {
		let extraRoleCreeps = util.getCreepsByRole(role)
			.slice(realDesiredCountByRole[role]);
		extraRoleCreeps.forEach(function(extraCreep) {
			extraCreeps.push(extraCreep);
		});
	});

	if (Game.time % 5 == 0) {
		Object.keys(realDesiredCountByRole).forEach((role) => {
			log5('countByRole['+role+']: ' + countByRole[role] + ' ?< ' + realDesiredCountByRole[role]);
		});
		log5('extraCreeps: ', extraCreeps.length);
	}

	//re-assign extra/chosen creeps (prioritize roles with 0 first)
	let reverseRoles = Object.keys(realDesiredCountByRole).slice().reverse();
	reverseRoles.forEach((role) => {
		if (countByRole[role] <= 0 && realDesiredCountByRole[role] > 0) {
			let extraCreep = extraCreeps.pop();
			if (extraCreep) {
				extraCreep.memory.role = role;
				countByRole[role]++;
			} else {
				let max = 0;
				let maxRole = null;
				Object.keys(realDesiredCountByRole).forEach((role) => {
					if (countByRole[role] > max) {
						max = countByRole[role];
						maxRole = role;
					}
				});
				if (maxRole) {
					let chosenCreep = util.getCreepsByRole(maxRole)[0];
					if (chosenCreep) {
						reassignCreep(chosenCreep, role);
					}
				}
			}
		}
	});

	//re-assign extra creeps
	let roles = Object.keys(realDesiredCountByRole);
	extraCreeps.forEach((extraCreep) => {
		for (let role in roles) {
			if (countByRole[role] < realDesiredCountByRole[role]) {
				reassignCreep(extraCreep, role);
				break;
			}
		}
	});

	//consider spawning creep
	Object.keys(realDesiredCountByRole).some((role) => {
		if (countByRole[role] < realDesiredCountByRole[role]) {
			log5('attempting to spawn');
			Game.spawns['Spawn1'].createCreep(newCreepBody, null, {role: role});
			return true;
		}
	});

	function reassignCreep(creep, newRole) {
		countByRole[creep.memory.role]--;
		creep.memory.role = newRole;
		countByRole[newRole]++;
	}
}

function log5(s, args) {
	if (Game.time % 5 == 0) {
		if (args) console.log(s, args);
		else console.log(s);
	}
}












function balanceRoles(desiredCountByRole) {
	let allRoles = Object.keys(desiredCountByRole);
	let allCreeps = util.getCreeps();

	//count creeps of each role
	let countByRole = {};
	allRoles.forEach(role => countByRole[role] = 0);
	allCreeps.forEach(creep => countByRole[creep.memory.role]++);

	//build adjustedDesiredCountByRole
	let adjustedDesiredCountByRole = {};
	allRoles.forEach(role => adjustedDesiredCountByRole[role] = desiredCountByRole[role]);
	let room = allCreeps[0].room;
	let constructions = room.find(FIND_CONSTRUCTION_SITES);
	if (constructions.length <= 0) {
		adjustedDesiredCountByRole.upgrader += adjustedDesiredCountByRole.builder;
		adjustedDesiredCountByRole.builder = 0;
	}

	//build targetCountByRole (simplified. ignores percent filled for now)
	let targetCountByRole = {};
	let creepCount = allCreeps.length;
	while (creepCount > 0) {
		let oldCreepCount = creepCount;
		allRoles.forEach(role => {
			targetCountByRole[role] = targetCountByRole[role] || 0;
			if (targetCountByRole[role] < adjustedDesiredCountByRole[role]) {
				targetCountByRole[role]++;
				creepCount--;
			}
		});
		if (creepCount >= oldCreepCount) {
			break;
		}
	}

	while (true) {
		let neededRole = null;
		let extraRole = null;
		allRoles.forEach(role => {
			console.log('count ?< target: ' + countByRole[role] + ' ?< ' + targetCountByRole[role]);
			if (countByRole[role] < targetCountByRole[role]) {
				neededRole = role;
			} else if (countByRole[role] > targetCountByRole[role]) {
				extraRole = role;
			}
		});
		console.log(extraRole + ' ?-> ' + neededRole);

		if (neededRole && extraRole) {
			let extraCreep = util.getCreepByRole(extraRole);
			console.log(extraCreep.name + ': ' + extraRole + ' -> ' + neededRole);
			reassignCreep(extraCreep, neededRole, countByRole);
		} else {
			break;
		}
	}
	function reassignCreep(creep, newRole, countByRole) {
		countByRole[creep.memory.role]--;
		creep.memory.role = newRole;
		countByRole[newRole]++;
	}

	//debug
	Object.keys(adjustedDesiredCountByRole).forEach((role) => {
		console.log('countByRole['+role+']: ' + countByRole[role] + ' ?< ' + adjustedDesiredCountByRole[role]);
	});
}