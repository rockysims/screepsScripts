import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';

export default class AttackAction extends AbstractAction {
	static type: string = 'attack';
	targetId: string;
	colorCode: string;
	child: MoveToRangeAction|undefined;

	constructor(target: Creep|Structure) {
		super(AttackAction.type);
		this.targetId = target.id;
		this.colorCode = '#ff6600';
	}

	static run(creep: Creep, action: AttackAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const target: Creep|Structure|null = Game.getObjectById(action.targetId);
		if (target) {
			const result: number = creep.attack(target);
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
				creep.say('#' + result + ' ' + AttackAction.type);
				return result;
			}
		}

		return false;
	}
}
