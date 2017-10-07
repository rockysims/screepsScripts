import AbstractAction from 'action/AbstractAction';

export default class ActionQ {
	static push(creep: Creep, action: AbstractAction) {
		creep.memory['actions'] = creep.memory['actions'] || [];
		creep.memory['actions'].push(action);
		console.log('push() action: ', JSON.stringify(action));
	}

	static clear(creep: Creep) {
		delete creep.memory['actions'];
	}
}