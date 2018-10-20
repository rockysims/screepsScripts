import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';

export default class ClaimAction extends AbstractAction {
	static type: string = 'claim';
	targetId: string;
	colorCode: string;
	child: MoveToRangeAction|undefined;

	constructor(target: StructureController) {
		super(ClaimAction.type);
		this.targetId = target.id;
		this.colorCode = '#ffff00';
	}

	static run(creep: Creep, action: ClaimAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const target: StructureController|null = Game.getObjectById(action.targetId);
		if (target) {
			const result: number = creep.claimController(target);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					target.pos,
					action.colorCode,
					1
				);
				return MoveToRangeAction.run(creep, action.child);
			} else {
				creep.say('#' + result + ' ' + ClaimAction.type);
				return result;
			}
		}

		return false;
	}
}
