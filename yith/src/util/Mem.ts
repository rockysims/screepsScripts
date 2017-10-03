export default class Mem {
	static onTick() {
		Object.keys(Memory.creeps || {}).forEach((name) => {
			if (!Game.creeps[name]) {
				console.log('Clearing non-existing creep memory: ' + name + ' (' + Memory.creeps[name].role + ')');
				delete Memory.creeps[name];
			}
		});

		Object.keys(Memory.rooms || {}).forEach((name) => {
			if (!Game.rooms[name]) {
				console.log('Clearing non-existing room memory: ' + name);
				delete Memory.rooms[name];
			}
		});

		Memory['byId'] = Memory['byId'] || {};
		Object.keys(Memory['byId']).forEach((id: string) => {
			if (!Game.getObjectById(id)) {
				console.log("Clearing non-existing memory['byId']: " + id);
				delete Memory['byId'][id];
			}
		});
	}

	static byId(id: string|{id: string}): any {
		let key: string = (typeof id == 'object')?id['id']:id;
		Memory['byId'] = Memory['byId'] || {};
		return Memory['byId'][key];
	}

	static byPos(position: RoomPosition|{pos: RoomPosition}): any {
		let pos: RoomPosition = (typeof position == 'object')?(<any>position)['pos']:position;
		let room: Room = Game.rooms[pos.roomName];
		let key: string = pos.x + ',' + pos.y;
		return room.memory[key];
	}
}