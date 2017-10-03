interface AllCache {
	time: number
	rooms?: Room[]
	spawns?: Spawn[]
	creeps?: Creep[]
	towers?: Tower[]
	structures?: Structure[]
	containers?: Container[]
}

export default class All {
	static cache: AllCache = {time: Game.time};

	static ensureFreshCache() {
		if (All.cache.time != Game.time) {
			All.cache = {time: Game.time};
		}
	}

	static rooms(): Room[] {
		All.ensureFreshCache();

		if (!All.cache.rooms) {
			All.cache.rooms = Object.keys(Game.rooms)
				.map(key => Game.rooms[key]);
		}

		return All.cache.rooms;
	}

	static spawns(): Spawn[] {
		All.ensureFreshCache();

		if (!All.cache.spawns) {
			All.cache.spawns = Object.keys(Game.spawns)
				.map(key => Game.spawns[key]);
		}

		return All.cache.spawns;
	}

	static creeps(): Creep[] {
		All.ensureFreshCache();

		if (!All.cache.creeps) {
			All.cache.creeps = Object.keys(Game.creeps)
				.map(key => Game.creeps[key]);
		}

		return All.cache.creeps;
	}

	static towers(): Tower[] {
		All.ensureFreshCache();

		if (!All.cache.towers) {
			All.cache.towers = <Tower[]>All
				.structures()
				.filter((structure: Structure) => structure.structureType == STRUCTURE_TOWER);
		}

		return All.cache.towers;
	}

	static structures(): Structure[] {
		All.ensureFreshCache();

		if (!All.cache.structures) {
			All.cache.structures = Object.keys(Game.structures)
				.map(key => Game.structures[key]);
		}

		return All.cache.structures;
	}

	static containers(): Container[] {
		All.ensureFreshCache();

		if (!All.cache.containers) {
			All.cache.containers = <Container[]>All
				.structures()
				.filter((structure: Structure) => structure.structureType == STRUCTURE_CONTAINER);
		}

		return All.cache.containers;
	}

	//---//

	//TODO: add caching to methods with suffix 'In'?

	static spawnsIn(room: Room): Spawn[] {
		return All
			.spawns()
			.filter((spawn: Spawn) => spawn.room.name == room.name);
	}

	static creepsIn(room: Room): Creep[] {
		return All
			.creeps()
			.filter((creep: Creep) => creep.room.name == room.name);
	}

	static towersIn(room: Room): Tower[] {
		return All
			.towers()
			.filter((tower: Tower) => tower.room.name == room.name);
	}

	static containersIn(room: Room): Container[] {
		return All
			.containers()
			.filter((container: Container) => container.room.name == room.name);
	}

	static creepsByRoleIn(role: string, room: Room): Creep[] {
		return All
			.creepsIn(room)
			.filter((crp) => crp.memory.role == role);
	}

	static sourcesIn(room: Room): Source[] {
		return room.find(FIND_SOURCES);
	}
}