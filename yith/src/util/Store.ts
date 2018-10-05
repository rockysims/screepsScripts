import Mem from "util/Mem";

interface StoreRoomMemory {
	minerContainerIds: string[]
}

export default class Store {
	static addMinerContainer(container: StructureContainer) {
		const mem: StoreRoomMemory = Mem.of(container.room);
		mem.minerContainerIds = mem.minerContainerIds || [];
		if (mem.minerContainerIds.indexOf(container.id) == -1) {
			mem.minerContainerIds.push(container.id);
		}
	}

	static minerContainersIn(room: Room): StructureContainer[] {
		const mem: StoreRoomMemory = Mem.of(room);
		mem.minerContainerIds = (mem.minerContainerIds || [])
			.filter(id => !!Game.getObjectById(id));
		return mem.minerContainerIds.map(id => Game.getObjectById(id) as StructureContainer);
	}
}