import Log from 'util/Log';
import Util from 'util/Util';
import SpawnRequest from 'SpawnRequest';
import All from 'All';

//TODO: add logic to build roads from room spawn & controller to each source that has a mining container

export default class RoomLogic {
	static onTick() {
		//no op
	}

	static run(room: Room) {
		const constructingExtensions = All
			.constructionSitesIn(room)
			.filter((constructionSite: ConstructionSite) => constructionSite.structureType == STRUCTURE_EXTENSION);

		if (constructingExtensions.length <= 0) {
			const builtExtensions: Extension[] = All.extensionsIn(room);
			let maxExtensions: number = Util.maxStructureCountIn(STRUCTURE_EXTENSION, room);
			if (builtExtensions.length < maxExtensions) {
				let pos: RoomPosition|undefined;

				//pos = closest tile to spawn where is plains and all 4 sides are plains|swamp
				let spawn: Spawn = All.spawnsIn(room)[0];
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
					//place extension
					room.createConstructionSite(pos, STRUCTURE_EXTENSION);
				} else {
					Log.warn('RoomLogic::run() failed to find pos to place extension. Room: ' + room.name);
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