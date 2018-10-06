import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class DeliverAction extends AbstractAction {
	static type: string = 'deliver';
	structureId: string;
	resourceType: ResourceConstant;
	child: MoveToRangeAction|undefined;

	constructor(structure: Structure, resourceType: ResourceConstant) {
		super(DeliverAction.type);
		this.structureId = structure.id;
		this.resourceType = resourceType;
	}

	static run(creep: Creep, action: DeliverAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const structure: Structure|undefined = Game.getObjectById(action.structureId) || undefined;
		const creepCarryAmount = creep.carry[action.resourceType] || 0;
		//TODO: instead of !isFull do Util.getEnergyIn(structure) >= Util.getCapacity(structure) - 20
		//	to prevent feeding tower 10 energy at a time until all delivered
		//		happens when tower is firing each tick
		if (structure && !Util.isFull(structure, action.resourceType) && creepCarryAmount > 0) {
			const result: number = creep.transfer(structure, action.resourceType);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					Util.posOf(structure),
					'#00ff00',
					1
				);
				return MoveToRangeAction.run(creep, action.child);

			} else {
				creep.say('#' + result + ' ' + DeliverAction.type);
				return result;
			}
		}

		return false;
	}
}