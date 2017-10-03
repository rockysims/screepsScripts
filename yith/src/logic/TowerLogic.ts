import SpawnRequest from 'SpawnRequest';
import All from "All";

export default class RoomLogic {
	static onTick() {
		//no op
	}

	static run(room: Room) {
		All.towersIn(room).forEach((tower: Tower) => {
			let closestHostile: Creep = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
			if (closestHostile) {
				tower.attack(closestHostile);
				Memory['attackCount'] = (Memory['attackCount'] || 0) + 1;
			} else {
				if (tower.energy > tower.energyCapacity - 250) {
					let damagedStructures: Structure[] = tower.pos.findInRange(FIND_STRUCTURES, 10, {
						filter: (structure: Structure) => structure.hits < structure.hitsMax
					});
					damagedStructures = damagedStructures.filter(s => s.hits < 1000000);
					damagedStructures.sort((a, b) => a.hits - b.hits); //lowest first
					let damagedStructure = damagedStructures[0];
					if (damagedStructure) {
						tower.repair(damagedStructure);
					}
				}
			}
		});
	}

	static generateSpawnRequest(): SpawnRequest {
		return {
			priority: 0,
			generateBody: () => [],
			memory: {role: 'none'}
		};
	}
}



//tick towers
//for (let roomKey in Game.rooms) {
//	let room = Game.rooms[roomKey];
//	var towers = room.find(
//		FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}
//	);
//	for (let towerKey in towers) {
//		let tower = towers[towerKey];
//		let closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
//		if (closestHostile) {
//			tower.attack(closestHostile);
//			Memory.attackCount = (Memory.attackCount || 0) + 1;
//		} else {
//			if (tower.energy > tower.energyCapacity - 250) {
//				let damagedStructures = tower.pos.findInRange(FIND_STRUCTURES, 10, {
//					filter: (structure) => structure.hits < structure.hitsMax
//				});
//				damagedStructures = damagedStructures.filter(s => s.hits < 1000000);
//				damagedStructures.sort((a, b) => a.hits - b.hits); //lowest first
//				let damagedStructure = damagedStructures[0];
//				if(damagedStructure) {
//					tower.repair(damagedStructure);
//				}
//			}
//		}
//	}
//}