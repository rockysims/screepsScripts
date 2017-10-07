import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import ActionQ from 'action/ActionQ';
import Util from 'util/Util';

export default class CollectAction extends AbstractAction {
	static type: string = 'collect';
	containerId: string;

	constructor(container: Container) {
		super(CollectAction.type);
		this.containerId = container.id;
	}

	static run(creep: Creep, action: CollectAction): boolean {
		const container: Container|undefined = Game.getObjectById(action.containerId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (container
			&& Util.getEnergy(container) > 0
			&& creepEnergy < creep.carryCapacity
		) {
			const result: number = creep.withdraw(container, RESOURCE_ENERGY);
			if (result == OK) {
				return false; //can withdraw all available at once so done collecting after first success
			} else if (result == ERR_NOT_IN_RANGE) {
				ActionQ.push(creep, new MoveToRangeAction(
					Util.posOf(container),
					'#00ffff',
					1
				));
				return true;
			} else {
				creep.say('#' + result + ' ' + CollectAction.type);
				return false;
			}
		}

		return false;
	}
}