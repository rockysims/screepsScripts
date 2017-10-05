import AbstractAction from 'action/AbstractAction';
import Action from 'action/Action';
import Util from 'util/Util';

export default class DeliverAction extends AbstractAction {
	static type: string = 'deliver';
	structureId: string;

	constructor(structure: Structure) {
		super(DeliverAction.type);
		this.structureId = structure.id;
	}

	static run(creep: Creep, action: DeliverAction): boolean {
		const structure: Structure|undefined = Game.getObjectById(action.structureId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (structure && !Util.isFull(structure) && creepEnergy > 0) {
			const result: number = creep.transfer(structure, RESOURCE_ENERGY);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, structure, '#00ff00', 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + DeliverAction.type);
				return false;
			}
		}

		return false;
	}
}