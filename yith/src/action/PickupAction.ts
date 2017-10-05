import AbstractAction from 'action/AbstractAction';
import Action from 'action/Action';

export default class PickupAction extends AbstractAction {
	static type: string = 'pickup';
	resourceId: string;

	constructor(resource: Resource) {
		super(PickupAction.type);
		this.resourceId = resource.id;
	}

	static run(creep: Creep, action: PickupAction): boolean {
		const resource: Resource|undefined = Game.getObjectById(action.resourceId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (resource && resource.amount > 0 && creepEnergy < creep.carryCapacity) {
			const result: number = creep.pickup(resource);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				Action.moveToRange(creep, resource, '#00ffff', 1);
				return true;
			} else {
				creep.say('#' + result + ' ' + PickupAction.type);
				return false;
			}
		}

		return false;
	}
}