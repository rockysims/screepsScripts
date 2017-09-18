import Log from "util/Log";
import Util from "util/Util";
import SpawnRequest from 'SpawnRequest';

export default class RoomLogic {
	static onTick() {
		//no op
	}

	static run(room: Room) {
		let constructingExtensionCount: number = room.find(FIND_CONSTRUCTION_SITES, {
			filter: (constructionSite: ConstructionSite) => constructionSite.structureType == STRUCTURE_EXTENSION
		}).length;

		if (constructingExtensionCount <= 0) {
			let builtExtensions: Container[] = room.find(FIND_MY_STRUCTURES, {
				filter: (structure: Structure) => structure.structureType == STRUCTURE_EXTENSION
			});
			let maxExtensions: number = Util.maxExtensionCount(room);
			if (builtExtensions.length < maxExtensions) {
				let pos: RoomPosition|undefined;

				//pos = closest tile to spawn where is plains and all 4 sides are plains|swamp
				let spawn: Spawn = Util.spawnsIn(room)[0];
				if (spawn) {
					let origin: RoomPosition = spawn.pos;
					let n = 1;
					while (n != -1 && n < 3) {
						let nthPos: RoomPosition|undefined = Util.getNthClosest(origin, n);
						if (nthPos) {
							room.visual.circle(nthPos);

							//TODO: ensure not only terrain is plain|swamp but also that there is no building there
							if (Util.terrainMatch([nthPos], ['plain'])) {
								let sides = Util.getAdjacent(nthPos);
								if (Util.terrainMatch(sides, ['plain', 'swamp'])) {
									//found valid pos
									//pos = nthPos;
									room.visual.text(n + '', nthPos);
									break;
								}
							}
						}

						n++;
					}
				}

				if (pos) {
					//place extension
					room.createConstructionSite(pos, STRUCTURE_CONTAINER);
				} else {
					Log.warn('RoomLogic::run() failed to find pos to place extension.')
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