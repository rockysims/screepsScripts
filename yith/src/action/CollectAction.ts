import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class CollectAction extends AbstractAction {
	static type: string = 'collect';
	targetId: string;
	child: MoveToRangeAction|undefined;

	constructor(target: StructureContainer|Tombstone) {
		super(CollectAction.type);
		this.targetId = target.id;
	}

	static run(creep: Creep, action: CollectAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const target: StructureContainer|Tombstone|undefined = Game.getObjectById(action.targetId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (target
			&& Util.getEnergy(target) > 0
			&& creepEnergy < creep.carryCapacity
		) {
			const result: number = creep.withdraw(target, RESOURCE_ENERGY);
			if (result == OK) {
				return false; //can withdraw all available at once so done collecting after first success
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					Util.posOf(target),
					'#00ffff',
					1
				);
				return MoveToRangeAction.run(creep, action.child);
			} else {
				creep.say('#' + result + ' ' + CollectAction.type);
				return result;
			}
		}

		return false;
	}
}