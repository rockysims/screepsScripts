import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class UpgradeAction extends AbstractAction {
	static type: string = 'upgrade';
	controllerId: string;
	child: MoveToRangeAction|undefined;

	constructor(controller: Controller) {
		super(UpgradeAction.type);
		this.controllerId = controller.id;
	}

	static run(creep: Creep, action: UpgradeAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const controller: Controller|undefined = Game.getObjectById(action.controllerId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (controller
			&& (controller.level < 8 || controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[controller.level] - 10)
			&& creepEnergy > 0
		) {
			const result: number = creep.upgradeController(controller);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					Util.posOf(controller),
					'#00ff00',
					3
				);
				return MoveToRangeAction.run(creep, action.child);

			} else {
				creep.say('#' + result + ' ' + UpgradeAction.type);
				return result;
			}
		}

		return false;
	}
}