interface StoreRoomMemory {
	minerContainerIds: string[]
}

export default class Store {
	static addMinerContainer(container: Container) {
		const mem: StoreRoomMemory = container.room.memory;
		mem.minerContainerIds = mem.minerContainerIds || [];
		if (mem.minerContainerIds.indexOf(container.id) == -1) {
			mem.minerContainerIds.push(container.id);
		}
	}

	static minerContainersIn(room: Room): Container[] {
		const mem: StoreRoomMemory = room.memory;
		mem.minerContainerIds = (mem.minerContainerIds || [])
			.filter(id => !!Game.getObjectById(id));
		return mem.minerContainerIds.map(id => Game.getObjectById(id) as Container);
	}
}