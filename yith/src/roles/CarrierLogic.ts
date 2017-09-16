import SpawnRequest from '../SpawnRequest';

export default class CarrierLogic {
	static onTick() {
		//no op
		//... or maybe consider building another storage building?
	}

	static run(creep: Creep) {
		console.log('creep: ' + creep.name);
//		if (any input container > 25% full)
//			collect energy from closest container
//			deliver to closest spawn/extension || output container < 100% full
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		console.log('room: ' + room.name);
//		if (any input container > 75% full && any output container < 75% full)
//			request spawn carrier (priority based on % of input containers > 75% full)
		return {
			priority: 0,
			generateBody: () => [],
			memory: {role: 'none'}
		};
	}
}