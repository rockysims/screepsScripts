import Mem from "util/Mem";

interface AllCache {
	time: number
	rooms?: Room[]
	spawns?: StructureSpawn[]
	creeps?: Creep[]
	towers?: StructureTower[]
	structures?: Structure[]
	extensions?: StructureExtension[]
	containers?: StructureContainer[]
	extractors?: StructureExtractor[]
	constructionSites?: ConstructionSite[]
	droppedEnergyByRoom: {[roomName: string]: Resource[]}
	droppedResourcesByRoom: {[roomName: string]: Resource[]}
	tombstonesByRoom: {[roomName: string]: Tombstone[]}
}

function getEmptyCache() {
	return {
		time: Game.time,
		droppedEnergyByRoom: {},
		droppedResourcesByRoom: {},
		tombstonesByRoom: {}
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

	static spawns(): StructureSpawn[] {
		All.ensureFreshCache();

		if (!All.cache.spawns) {
			All.cache.spawns = Object.keys(Game.spawns)
				.map(key => Game.spawns[key]);
		}

		return All.cache.spawns;
	}

	static creeps(includeSpawning?: boolean): Creep[] {
		All.ensureFreshCache();

		if (!All.cache.creeps) {
			All.cache.creeps = Object.keys(Game.creeps)
				.map(key => Game.creeps[key]);
		}

		return (includeSpawning)
			? All.cache.creeps
			: All.cache.creeps
				.filter((creep: Creep) => {
					return !creep.spawning;
				});
	}

	static towers(): StructureTower[] {
		All.ensureFreshCache();

		if (!All.cache.towers) {
			All.cache.towers = <StructureTower[]>All
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
				const containers = (room.find<StructureContainer>(FIND_STRUCTURES, {
					filter: (structure: Structure) => structure.structureType == STRUCTURE_CONTAINER
				}) || []);
				All.cache.structures = All.cache.structures || [];
				All.cache.structures.push(...containers);
			});
		}

		return All.cache.structures;
	}

	static extensions(): StructureExtension[] {
		All.ensureFreshCache();

		if (!All.cache.extensions) {
			All.cache.extensions = <StructureExtension[]>All
				.structures()
				.filter((structure: Structure) => structure.structureType == STRUCTURE_EXTENSION);
		}

		return All.cache.extensions;
	}

	static containers(): StructureContainer[] {
		All.ensureFreshCache();

		if (!All.cache.containers) {
			All.cache.containers = <StructureContainer[]>All
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

	static spawnsIn(room: Room): StructureSpawn[] {
		return All
			.spawns()
			.filter((spawn: StructureSpawn) => spawn.room.name == room.name);
	}

	static creepsIn(room: Room, includeSpawning?: boolean): Creep[] {
		return All
			.creeps(includeSpawning)
			.filter((creep: Creep) => {
				return creep.room.name == room.name
					&& (includeSpawning || !creep.spawning)
			});
	}

	static towersIn(room: Room): StructureTower[] {
		return All
			.towers()
			.filter((tower: StructureTower) => tower.room.name == room.name);
	}

	static extensionsIn(room: Room): StructureExtension[] {
		return All
			.extensions()
			.filter((extension: StructureExtension) => extension.room.name == room.name);
	}

	static containersIn(room: Room): StructureContainer[] {
		return All
			.containers()
			.filter((container: StructureContainer) => container.room.name == room.name);
	}

	static extractorsIn(room: Room): StructureExtractor[] {
		return All
			.extractors()
			.filter((extractor: StructureExtractor) => extractor.room.name == room.name);
	}

	static creepsByRoleIn(role: string, room: Room, includeSpawning?: boolean): Creep[] {
		return All
			.creepsIn(room, includeSpawning)
			.filter((creep) => Mem.of(creep)['role'] == role);
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
			All.cache.droppedEnergyByRoom[room.name] = All.droppedResourcesIn(room)
				.filter(r => r.resourceType == RESOURCE_ENERGY);
		}

		return All.cache.droppedEnergyByRoom[room.name];
	}

	static droppedResourcesIn(room: Room): Resource[] {
		All.ensureFreshCache();

		if (!All.cache.droppedResourcesByRoom[room.name]) {
			All.cache.droppedResourcesByRoom[room.name] = room.find(FIND_DROPPED_RESOURCES);
		}

		return All.cache.droppedResourcesByRoom[room.name];
	}

	static tombstonesIn(room: Room): Tombstone[] {
		All.ensureFreshCache();

		if (!All.cache.tombstonesByRoom[room.name]) {
			All.cache.tombstonesByRoom[room.name] = room.find(FIND_TOMBSTONES);
		}

		return All.cache.tombstonesByRoom[room.name];
	}

	static sourcesIn(room: Room): Source[] {
		return room.find(FIND_SOURCES);
	}

	static mineralsIn(room: Room): Mineral[] {
		return room.find(FIND_MINERALS);
	}
}