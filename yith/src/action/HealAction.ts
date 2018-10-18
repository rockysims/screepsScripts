import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';

export default class HealAction extends AbstractAction {
	static type: string = 'heal';
	targetId: string;
	colorCode: string;
	child: MoveToRangeAction|undefined;

	constructor(target: Creep) {
		super(HealAction.type);
		this.targetId = target.id;
		this.colorCode = '#00ff00';
	}

	static run(creep: Creep, action: HealAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const target: Creep|null = Game.getObjectById(action.targetId);
		if (target && target.hits < target.hitsMax) {
			const result: number = creep.heal(target);
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
				creep.say('#' + result + ' ' + HealAction.type);
				return result;
			}
		}

		return false;
	}
}
