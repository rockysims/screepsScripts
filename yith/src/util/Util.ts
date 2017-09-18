import getAll from 'getAll';
import Log from "util/Log";

export default class Util {
	static costOf(bodyParts: Array<string>): number {
		return bodyParts.reduce((carry: number, bodyPart: string) => carry + BODYPART_COST[bodyPart], 0);
	}

	static countByRole(creeps: Array<Creep>): {[role: string]: number} {
		let countByRole: {[role: string]: number} = {};
		creeps.forEach((creep: Creep) => {
			let role = creep.memory.role || '?';
			countByRole[role] = countByRole[role] || 0;
			countByRole[role]++;
		});
		return countByRole;
	}

	static creepsIn(room: Room): Creep[] {
		let all = getAll();
		return all.creeps
			.filter((creep: Creep) => creep.room.name == room.name);
	}

	static spawnsIn(room: Room): Spawn[] {
		let all = getAll();
		return all.spawns
			.filter((spawn: Spawn) => spawn.room.name == room.name);
	}

	static maxExtensionCount(room: Room): number {
		let structureTypeMaxByLevel: {[level: number]: number} = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION] || {};
		if (room.controller) {
			return structureTypeMaxByLevel[room.controller.level] || 0;
		} else {
			return 0;
		}
	}

	static terrainMatch(positions: RoomPosition[], matchingTerrains: string[]): boolean {
		return positions.every((pos: RoomPosition) => {
			let lookResults: string[] = pos.lookFor(LOOK_TERRAIN);
			if (lookResults.length > 0) {
				let terrain: string = lookResults[0] || '?';
				return matchingTerrains.indexOf(terrain) != -1;
			} else {
				return false;
			}
		});
	}

	static getAdjacent(pos: RoomPosition): RoomPosition[] {
		let room = Game.rooms[pos.roomName];
		if (room) {
			let adjacents: (RoomPosition|undefined)[] = [];
			adjacents.push(room.getPositionAt(pos.x + 1, pos.y) || undefined);
			adjacents.push(room.getPositionAt(pos.x - 1, pos.y) || undefined);
			adjacents.push(room.getPositionAt(pos.x, pos.y + 1) || undefined);
			adjacents.push(room.getPositionAt(pos.x, pos.y - 1) || undefined);
			return <RoomPosition[]>adjacents.filter((pos: RoomPosition) => !!pos);
		}

		return [];
	}

	static getNthClosest(origin: RoomPosition, n: number): RoomPosition|undefined {
		if (n > 0) {
			let layer = 1;
			let layerSize: number = 4 * (layer * 2);
			while (n > layerSize) {
				n -= layerSize;
				layer++;
				layerSize = 4 * (layer * 2);
			}

			let xCorner: number = origin.x - layer;
			let yCorner: number = origin.y - layer;
			let offset = Math.floor((n-1) / 4);

			let x = 0;
			let y = 0;
			if (n % 4 == 0) { //top left + x
				x = xCorner;
				y = yCorner;
				x += offset;
			} else if (n % 4 == 1) { //top right + y
				x = xCorner + (layerSize / 4);
				y = yCorner;
				y += offset;
			} else if (n % 4 == 2) { //bottom right - x
				x = xCorner + (layerSize / 4);
				y = yCorner + (layerSize / 4);
				x -= offset;
			} else { //bottom left - y
				x = xCorner;
				y = yCorner + (layerSize / 4);
				y -= offset;
			}

			let room = Game.rooms[origin.roomName];
			if (room) {
				return room.getPositionAt(x, y) || undefined;
			} else {
				Log.error('Util::getNthClosest() failed to find room.');
			}
		} else {
			return origin;
		}
	}
}