import Action from "util/Action";
import SpawnRequest from 'SpawnRequest';
import Util from "util/Util";
import Mem from "util/Mem";
import All from 'All';

export default class CarrierLogic {
	static onTick() {
		//no op
		//... or maybe consider building another storage building?
	}

	static run(creep: Creep) {
		if (Action.continue(creep)) return;

		let creepEnergy = creep.carry.energy || 0;
		let mem = creep.memory;
		let origMemCarrying = mem.carrying;

		if (mem.carrying) {
			Action.emptyEnergy(creep);
			if (creepEnergy <= 0) {
				mem.carrying = false;
			}
		} else {
			Action.fillEnergy(creep);
			if (creepEnergy >= creep.carryCapacity) {
				mem.carrying = true;
			}
		}

		if (mem.carrying != origMemCarrying) {
			if (mem.carrying) creep.say('deliver');
			else creep.say('collect');
		}
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		console.log('room: ' + room.name);
//		if (any input container > 75% full && any output container < 75% full)
//			request spawn carrier (priority based on % of input containers > 75% full)
//		maybe use Mem.byId(structureId).isInput/.isOutput





		//TODO: fix issue where container site has isInputContainer flag but built container doesn't (untested but almost certain an issue)
		All.containersIn(room).forEach((container: Container) => {
			let isInputContainer: boolean = Mem.byId(container)['isInputContainer'];
			console.log('isInputContainer: ', isInputContainer);
		});

		let priority = 0; //TODO: set

		let spawnRequest: SpawnRequest = {
			priority: priority,
			generateBody: (energyAvailable: number): string[] => {
				return Util.generateBodyFromSet([CARRY, MOVE], energyAvailable);
			},
			memory: {role: 'carrier'}
		};
		console.log('spawnRequest: ', spawnRequest);



		return {
			priority: 0,
			generateBody: () => [],
			memory: {role: 'none'}
		};
	}
}