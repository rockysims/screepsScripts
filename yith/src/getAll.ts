interface AllInterface {
	rooms: Room[],
	spawns: Spawn[],
	creeps: Creep[]
}

let cachedAll: AllInterface;
export default {
	get: function(): AllInterface {
		if (!cachedAll) {
			cachedAll = {
				rooms: Object.keys(Game.rooms)
					.map(key => Game.rooms[key]),
				spawns: Object.keys(Game.spawns)
					.map(key => Game.spawns[key]),
				creeps: Object.keys(Game.creeps)
					.map(key => Game.creeps[key])
			};
		}

		return cachedAll;
	}
}