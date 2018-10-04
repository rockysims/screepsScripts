import Log from "util/Log";
import All from "All";

export default class Util {
	static costOf(bodyParts: Array<string>): number {
		return bodyParts.reduce((carry: number, bodyPart: string) => carry + BODYPART_COST[bodyPart], 0);
	}

	static generateBodyFromSet(set: string[], energyAvailable: number) {
		const body = new Array(Math.floor(energyAvailable / Util.costOf(set)))
			.fill(set)
			.reduce((carry, s) => carry.concat(s), [])
			.sort((a: string, b: string) => set.indexOf(a) - set.indexOf(b));
		return body;
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

	static countByRoleInRoom(role: string, room: Room): number {
		return Util.countByRole(All.creepsIn(room))[role] || 0;
	}

	static maxStructureCountIn(type: string, room: Room): number {
		let structureTypeMaxByLevel: {[level: number]: number} = CONTROLLER_STRUCTURES[type] || {};
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

	static isBuildable(positions: RoomPosition[]): boolean {
		let buildable: boolean = true;

		const nonBuildableTypes: string[] = [
			LOOK_SOURCES,
			LOOK_MINERALS,
			LOOK_STRUCTURES,
			LOOK_CONSTRUCTION_SITES,
			LOOK_NUKES
		];
		positions.forEach((pos: RoomPosition) => {
			let looks: LookAtResult[] = pos.look();
			for (let look of looks) {
				let isWall: boolean = look.terrain == 'wall';
				let isBuildable: boolean = nonBuildableTypes.indexOf(look.type) == -1;
				if (isWall || !isBuildable) {
					buildable = false;
				}
			}
		});

		return buildable;
	}

	static getAdjacent(pos: RoomPosition, deltas: Array<{ x: number; y: number }>): RoomPosition[] {
		let room = Game.rooms[pos.roomName];
		return room
			? deltas
				.map(delta => room.getPositionAt(pos.x + delta.x, pos.y + delta.y) || undefined)
				.filter(pos => !!pos) as RoomPosition[]
			: [];
	}

	static getAdjacent4(pos: RoomPosition): RoomPosition[] {
		return Util.getAdjacent(
			pos,
			[
				{ x: +1, y:  0},
				{ x: -1, y:  0},
				{ x:  0, y: +1},
				{ x:  0, y: -1},
			]
		);
	}

	static getAdjacent8(position: RoomPosition|{pos: RoomPosition}): RoomPosition[] {
		return Util.getAdjacent(
			Util.posOf(position),
			[
				{ x: +1, y:  0},
				{ x: -1, y:  0},
				{ x:  0, y: +1},
				{ x:  0, y: -1},

				{ x: -1, y: -1},
				{ x: -1, y: +1},
				{ x: +0, y: -1},
				{ x: +0, y: +1},
			]
		);
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

	static posOf(position: RoomPosition|{pos: RoomPosition}): RoomPosition {
		return (typeof position == 'object')?(<any>position)['pos']:position;
	}

	static getEnergy(structure: Structure): number {
		switch (structure.structureType) {
			case STRUCTURE_SPAWN:
				return (structure as Spawn).energy;
			case STRUCTURE_EXTENSION:
				return (structure as Extension).energy;
			case STRUCTURE_TOWER:
				return (structure as Tower).energy;
			case STRUCTURE_LINK:
				return (structure as Link).energy;
			case STRUCTURE_CONTAINER:
				return (structure as Container).store[RESOURCE_ENERGY] || 0;
			case STRUCTURE_STORAGE:
				return (structure as Storage).store[RESOURCE_ENERGY] || 0;
			case STRUCTURE_TERMINAL:
				return (structure as Terminal).store[RESOURCE_ENERGY] || 0;
			default:
				Log.error('Util::getEnergy() failed to get energy for structureType: ' + structure.structureType);
				return 0;
		}
	}

	static getCapacity(structure: Structure): number {
		switch (structure.structureType) {
			case STRUCTURE_SPAWN:
				return (structure as Spawn).energyCapacity;
			case STRUCTURE_EXTENSION:
				return (structure as Extension).energyCapacity;
			case STRUCTURE_TOWER:
				return (structure as Tower).energyCapacity;
			case STRUCTURE_LINK:
				return (structure as Link).energyCapacity;
			case STRUCTURE_CONTAINER:
				return (structure as Container).storeCapacity;
			case STRUCTURE_STORAGE:
				return (structure as Storage).storeCapacity;
			case STRUCTURE_TERMINAL:
				return (structure as Terminal).storeCapacity;
			default:
				Log.error('Util::getEnergy() failed to get energy for structureType: ' + structure.structureType);
				return 0;
		}
	}

	static terminalSpace(terminal: Terminal) {
		let terminalStoreUsed = 0;
		RESOURCES_ALL.forEach(resourceType => {
			terminalStoreUsed += terminal.store[resourceType] || 0;
		});
		return terminal.storeCapacity - terminalStoreUsed;
	}

	static isFull(structure: Structure) {
		//TODO: handle case where structure is full but not full of energy (at least not entirely)
		return Util.getEnergy(structure) >= Util.getCapacity(structure);
	}
}