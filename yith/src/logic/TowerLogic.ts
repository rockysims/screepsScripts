import SpawnRequest from 'SpawnRequest';
import Util from 'util/Util';
import Log from 'util/Log';
import All from 'All';

export default class TowerLogic {
	static onTick() {
		const roomsWithSpawners = All.rooms().filter(r => All.spawnsIn(r).length > 0);
		roomsWithSpawners.forEach((room) => {
			let constructingTowerCount: number = All
				.constructionSitesIn(room)
				.filter((constructionSite: ConstructionSite) => constructionSite.structureType == STRUCTURE_TOWER)
				.length;

			if (constructingTowerCount <= 0) {
				let builtTowers: StructureTower[] = All.towersIn(room);
				let maxTowers: number = Util.maxStructureCountIn(STRUCTURE_TOWER, room);
				if (builtTowers.length < maxTowers) {
					let pos: RoomPosition|undefined;

					//pos = closest tile to spawn where is plains and all 4 sides are plains|swamp
					let spawn: StructureSpawn = All.spawnsIn(room)[0];
					if (spawn) {
						let origin: RoomPosition = spawn.pos;
						let n = 9; //skip first 8
						while (n != -1 && n < 150) {
							let nthPos: RoomPosition|undefined = Util.getNthClosest(origin, n);
							if (nthPos) {
								if (Util.terrainMatch([nthPos], ['plain']) && Util.isBuildable([nthPos])) {
									let sides = Util.getAdjacent4(nthPos);
									if (Util.terrainMatch(sides, ['plain', 'swamp']) && Util.isBuildable(sides)) {
										//found valid pos
										pos = nthPos;
										break;
									}
								}
							}

							n++;
						}
					}

					if (pos) {
						//place tower
						room.createConstructionSite(pos, STRUCTURE_TOWER);
					} else {
						Log.warn('TowerLogic::onTick() failed to find pos to place tower. Room: ' + room.name);
					}
				}
			}
		});
	}

	static run(tower: StructureTower) {
		let closestHostile: Creep|null = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
		if (closestHostile) {
			tower.attack(closestHostile);
			Memory['attackCount'] = (Memory['attackCount'] || 0) + 1;
		} else {
			if (tower.energy > tower.energyCapacity - 250) {
				let damagedStructures: Structure[] = tower.pos.findInRange(FIND_STRUCTURES, 10, {
					filter: (structure: Structure) => structure.hits < structure.hitsMax
				});
				damagedStructures = damagedStructures.filter(s =>
					(s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART)
					|| s.hits < 10000
				);
				damagedStructures = damagedStructures.filter(s => s.hits < 1000000);
				damagedStructures.sort((a, b) => a.hits - b.hits); //lowest first
				let damagedStructure = damagedStructures[0];
				if (damagedStructure) {
					tower.repair(damagedStructure);
				}
			}
		}
	}

	static generateSpawnRequest(): SpawnRequest {
		return {
			priority: 0,
			generateBody: () => [],
			memory: {role: 'none'}
		};
	}
}