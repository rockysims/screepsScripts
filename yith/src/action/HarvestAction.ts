import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class HarvestAction extends AbstractAction {
	static type: string = 'harvest';
	sourceId: string;
	colorCode: string;
	child: MoveToRangeAction|undefined;

	constructor(source: Source, colorCode: string) {
		super(HarvestAction.type);
		this.sourceId = source.id;
		this.colorCode = colorCode;
	}

	static run(creep: Creep, action: HarvestAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const source: Source|undefined = Game.getObjectById(action.sourceId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (source
			&& source.energy > 0
			&& (creepEnergy < creep.carryCapacity || creep.carryCapacity == 0)
		) {
			const result: number = creep.harvest(source);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					Util.posOf(source),
					action.colorCode,
					1
				);
				return MoveToRangeAction.run(creep, action.child);
			} else {
				creep.say('#' + result + ' ' + HarvestAction.type);
				return result;
			}
		}

		return false;
	}
}
