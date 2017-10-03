interface StoreRoomMemory {
	minerContainerIds: string[]
}

export default class Store {
	static addMinerContainer(container: Container) {
		const mem: StoreRoomMemory = container.room.memory;
		mem.minerContainerIds = mem.minerContainerIds || [];
		mem.minerContainerIds.push(container.id);
	}

	static minerContainersIn(room: Room): Container[] {
		const mem: StoreRoomMemory = room.memory;
		mem.minerContainerIds = mem.minerContainerIds || [];
		mem.minerContainerIds = mem.minerContainerIds.filter(id => !!Game.getObjectById(id));
		return mem.minerContainerIds.map(id => <Container>Game.getObjectById(id));
	}
}