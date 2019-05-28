import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class CollectAction extends AbstractAction {
	static type: string = 'collect';
	targetId: string;
	resourceType: ResourceConstant;
	child: MoveToRangeAction|undefined;
	maxAmount: number|null;

	constructor(target: StructureContainer|StructureStorage|StructureTerminal|Tombstone, resourceType: ResourceConstant, maxAmount: number|null) {
		super(CollectAction.type);
		this.targetId = target.id;
		this.resourceType = resourceType;
		this.maxAmount = maxAmount;
	}

	static run(creep: Creep, action: CollectAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const target: StructureContainer|StructureStorage|StructureTerminal|Tombstone|undefined
			= Game.getObjectById(action.targetId) || undefined;
		const creepCarryAmount = creep.carry[action.resourceType] || 0;
		if (target
			&& Util.amountIn(target, action.resourceType) > 0
			&& creepCarryAmount < creep.carryCapacity
		) {
			const amount = (action.maxAmount && action.maxAmount < Util.freeSpaceIn(creep))
				? action.maxAmount
				: undefined; //withdraw all that's available
			const result: number = creep.withdraw(target, action.resourceType, amount);
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