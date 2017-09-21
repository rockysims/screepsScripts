export default class All {
	static cache: any = {};

	static ensureFreshCache() {
		if (All.cache['tick'] != Game.time) {
			All.cache = {};
		}
	}

	static rooms(): Room[] {
		All.ensureFreshCache();

		if (!All.cache['rooms']) {
			All.cache['rooms'] = Object.keys(Game.rooms)
				.map(key => Game.rooms[key]);
		}

		return All.cache['rooms'];
	}

	static spawns(): Spawn[] {
		All.ensureFreshCache();

		if (!All.cache['spawns']) {
			All.cache['spawns'] = Object.keys(Game.spawns)
				.map(key => Game.spawns[key]);
		}

		return All.cache['spawns'];
	}

	static creeps(): Creep[] {
		All.ensureFreshCache();

		if (!All.cache['creeps']) {
			All.cache['creeps'] = Object.keys(Game.creeps)
				.map(key => Game.creeps[key]);
		}

		return All.cache['creeps'];
	}

	static structures(): Structure[] {
		All.ensureFreshCache();

		if (!All.cache['structures']) {
			All.cache['structures'] = Object.keys(Game.structures)
				.map(key => Game.structures[key]);
		}

		return All.cache['structures'];
	}

	static containers(): Container[] {
		All.ensureFreshCache();

		if (!All.cache['containers']) {
			All.cache['containers'] = All
				.structures()
				.filter((structure: Structure) => structure.structureType == STRUCTURE_CONTAINER);
		}

		return All.cache['containers'];
	}

	//---//

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

	static containersIn(room: Room): Container[] {
		return All
			.containers()
			.filter((structure: Structure) => structure.room.name == room.name);
	}
}