import Mem from "util/Mem";
import Log from "util/Log";
import All from "All";

export default class Util {
	static costOf(bodyParts: BodyPartConstant[]): number {
		return bodyParts.reduce((carry: number, bodyPart: BodyPartConstant) => carry + BODYPART_COST[bodyPart], 0);
	}

	static generateBodyFromSet(set: BodyPartConstant[], energyAvailable: number, maxSets?: number): BodyPartConstant[] {
		maxSets = maxSets || energyAvailable;
		const setCost = Util.costOf(set);
		const body: BodyPartConstant[] = [];
		let setsCount = 0;
		while (setCost <= energyAvailable && setsCount < maxSets) {
			energyAvailable -= setCost;
			body.push(... set);
			setsCount++;
		}
		return body;
	}

	static countByRole(creeps: Array<Creep>): {[role: string]: number} {
		let countByRole: {[role: string]: number} = {};
		creeps.forEach((creep: Creep) => {
			let role = Mem.of(creep)['role'] as string || '?';
			countByRole[role] = countByRole[role] || 0;
			countByRole[role]++;
		});
		return countByRole;
	}

	static countByRoleInRoom(role: string, room: Room): number {
		return Util.countByRole(All.creepsIn(room))[role] || 0;
	}

	static maxStructureCountIn(type: BuildableStructureConstant, room: Room): number {
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

	static getEnergyIn(thing: Structure|{energy: number}|{store: StoreDefinition}): number {
		const anyThing = thing as any;
		let energy = 0;
		if (anyThing['energy']) {
			energy = anyThing['energy'];
		} else if (anyThing['store']) {
			energy = anyThing['store'][RESOURCE_ENERGY] || 0;
		}
		return energy;
	}

	static amountIn(thing: {energy: number}|{store: StoreDefinition}, resourceType: ResourceConstant): number {
		const anyThing = thing as any;
		let amount = 0;
		if (anyThing['store']) {
			amount = anyThing['store'][resourceType] || 0;
		} else if (anyThing['energy'] && resourceType === RESOURCE_ENERGY) {
			amount = anyThing['energy'];
		}
		return amount;
	}

	static firstResourceTypeIn(store: StoreDefinition): ResourceConstant|null {
		for (let key of Object.keys(store)) {
			const resourceType = key as ResourceConstant;
			if ((store[resourceType] || 0) > 0) {
				return resourceType;
			}
		}
		return null;
	}

	/**
	 * Check how much space is used in thing's reservoir (reservoir that can hold resourceType).
	 * If resourceType is omitted, 'reservoir' in question is reservoir that could be filled with any resourceType.
	 */
	static usedSpaceIn(thing: any, resourceType?: ResourceConstant): number {
		let used = 0;

		const store: StoreDefinition|undefined =  thing.carry || thing.store;
		if (store) {
			Object.keys(store).forEach((resourceType: string) => {
				used += store[resourceType as ResourceConstant] || 0;
			});
		} else {
			const isMineralResource = resourceType != RESOURCE_ENERGY; //power is also considered a mineral in this context
			if (thing.mineralAmount && isMineralResource) used += thing.mineralAmount;
			if (thing.energy && resourceType == RESOURCE_ENERGY) used += thing.energy;
			if (thing.power && resourceType == RESOURCE_POWER) used += thing.power;
			if (thing.ghodium && resourceType == RESOURCE_GHODIUM) used += thing.ghodium;
		}

		return used;
	}

	/**
	 * Check how much free space thing has for resourceType.
	 * If resourceType is omitted, 'space' in question is space that could be filled with any resourceType.
	 */
	static freeSpaceIn(thing: any, resourceType?: ResourceConstant): number {
		let capacity = 0;
		if (thing.carryCapacity) capacity = thing.carryCapacity;
		else if (thing.storeCapacity) capacity = thing.storeCapacity;
		else if (resourceType) {
			const isMineralResource = resourceType != RESOURCE_ENERGY && resourceType != RESOURCE_POWER;
			if (thing.mineralCapacity && isMineralResource) capacity = thing.mineralCapacity;
			if (thing.energyCapacity && resourceType == RESOURCE_ENERGY) capacity = thing.energyCapacity;
			if (thing.powerCapacity && resourceType == RESOURCE_POWER) capacity = thing.powerCapacity;
			if (thing.ghodiumCapacity && resourceType == RESOURCE_GHODIUM) capacity = thing.ghodiumCapacity;
		}

		return Math.max(0, capacity - Util.usedSpaceIn(thing, resourceType));
	}

	/**
	 * Check if thing has no space available for resourceType.
	 * If resourceType is omitted, 'space' in question is space that could be filled with any resourceType.
	 */
	static isFull(thing: any, resourceType?: ResourceConstant) {
		return Util.freeSpaceIn(thing, resourceType) <= 0;
	}
}
























