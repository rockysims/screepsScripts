interface AllCache {
	time: number
	rooms?: Room[]
	spawns?: Spawn[]
	creeps?: Creep[]
	towers?: Tower[]
	structures?: Structure[]
	extensions?: Extension[]
	containers?: Container[]
	extractors?: StructureExtractor[]
	constructionSites?: ConstructionSite[]
	droppedEnergyByRoom: {[roomName: string]: Resource[]}
}

function getEmptyCache() {
	return {
		time: Game.time,
		droppedEnergyByRoom: {}
	};
}

export default class All {
	static cache: AllCache = getEmptyCache();

	static ensureFreshCache() {
		if (All.cache.time != Game.time) {
			All.cache = getEmptyCache();
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
			All.rooms().forEach(room => {
				const containers = (room.find<Container>(FIND_STRUCTURES, {
					filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
				}) || []);
				All.cache.structures = All.cache.structures || [];
				All.cache.structures.push(...containers);
			});
		}

		return All.cache.structures;
	}

	static extensions(): Extension[] {
		All.ensureFreshCache();

		if (!All.cache.extensions) {
			All.cache.extensions = <Extension[]>All
				.structures()
				.filter((structure: Structure) => structure.structureType == STRUCTURE_EXTENSION);
		}

		return All.cache.extensions;
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

	static extractors(): StructureExtractor[] {
		All.ensureFreshCache();

		if (!All.cache.extractors) {
			All.cache.extractors = <StructureExtractor[]>All
				.structures()
				.filter((structure: Structure) => structure.structureType == STRUCTURE_EXTRACTOR);
		}

		return All.cache.extractors;
	}

	static constructionSites(): ConstructionSite[] {
		All.ensureFreshCache();

		if (!All.cache.constructionSites) {
			All.cache.constructionSites = Object.keys(Game.constructionSites)
				.map(key => Game.constructionSites[key]);
		}

		return All.cache.constructionSites;
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

	static extensionsIn(room: Room): Extension[] {
		return All
			.extensions()
			.filter((extension: Extension) => extension.room.name == room.name);
	}

	static containersIn(room: Room): Container[] {
		return All
			.containers()
			.filter((container: Container) => container.room.name == room.name);
	}

	static extractorsIn(room: Room): StructureExtractor[] {
		return All
			.extractors()
			.filter((extractor: StructureExtractor) => extractor.room.name == room.name);
	}

	static creepsByRoleIn(role: string, room: Room): Creep[] {
		return All
			.creepsIn(room)
			.filter((crp) => crp.memory.role == role);
	}

	static constructionSitesIn(room: Room, typeFilter?: String): ConstructionSite[] {
		const sites = All
			.constructionSites()
			.filter((site: ConstructionSite) => site.room && site.room.name == room.name);

		return (typeFilter)
			? sites
				.filter((site: ConstructionSite) => site.structureType == typeFilter)
			: sites;
	}

	static droppedEnergyIn(room: Room): Resource[] {
		All.ensureFreshCache();

		if (!All.cache.droppedEnergyByRoom[room.name]) {
			All.cache.droppedEnergyByRoom[room.name] = room.find(FIND_DROPPED_RESOURCES, {
				filter: (resource: Resource) => resource.resourceType == RESOURCE_ENERGY
			});
		}
		return All.cache.droppedEnergyByRoom[room.name];
	}

	// static tombstonesIn(room: Room): Tomb[] {
	// 	All.ensureFreshCache();
	//
	// 	if (!All.cache.droppedEnergyByRoom[room.name]) {
	// 		All.cache.droppedEnergyByRoom[room.name] = room.find(FIND_TOMBSTONES, {
	// 			filter: (resource: Resource) => resource.resourceType == RESOURCE_ENERGY
	// 		});
	// 	}
	// 	return All.cache.droppedEnergyByRoom[room.name];
	// }

	static sourcesIn(room: Room): Source[] {
		return room.find(FIND_SOURCES);
	}

	static mineralsIn(room: Room): Mineral[] {
		return room.find(FIND_MINERALS);
	}
}