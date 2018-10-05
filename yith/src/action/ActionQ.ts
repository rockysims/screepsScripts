import AbstractAction from 'action/AbstractAction';
import Mem from "util/Mem";

export default class ActionQ {
	static push(creep: Creep, action: AbstractAction) {
		const creepMem = Mem.of(creep);
		creepMem['actions'] = creepMem['actions'] || [];
		creepMem['actions'].push(action);
		// console.log(creepMem.role + ' ' + creep.name + ' push() action: ', JSON.stringify(action));
	}

	static clear(creep: Creep) {
		delete Mem.of(creep)['actions'];
	}
}