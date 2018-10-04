import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class PickupAction extends AbstractAction {
	static type: string = 'pickup';
	resourceId: string;
	child: MoveToRangeAction|undefined;

	constructor(resource: Resource) {
		super(PickupAction.type);
		this.resourceId = resource.id;
	}

	static run(creep: Creep, action: PickupAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const resource: Resource|undefined = Game.getObjectById(action.resourceId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (resource && resource.amount > 0 && creepEnergy < creep.carryCapacity) {
			const result: number = creep.pickup(resource);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					Util.posOf(resource),
					'#00ffff',
					1
				);
				return MoveToRangeAction.run(creep, action.child);
			} else {
				creep.say('#' + result + ' ' + PickupAction.type);
				return result;
			}
		}

		return false;
	}
}