import AbstractAction from 'action/AbstractAction';
import Action from 'action/Action';

export default class UpgradeAction extends AbstractAction {
	static type: string = 'upgrade';
	controllerId: string;

	constructor(controller: Controller) {
		super(UpgradeAction.type);
		this.controllerId = controller.id;
	}

	static run(creep: Creep, action: UpgradeAction): boolean {
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
				Action.moveToRange(creep, controller, '#00ff00', 3);
				return true;
			} else {
				creep.say('#' + result + ' ' + UpgradeAction.type);
				return false;
			}
		}

		return false;
	}
}