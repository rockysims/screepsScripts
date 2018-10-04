import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class ExtractAction extends AbstractAction {
	static type: string = 'extract';
	mineralId: string;
	colorCode: string;
	child: MoveToRangeAction|undefined;

	constructor(mineral: Mineral, colorCode: string) {
		super(ExtractAction.type);
		this.mineralId = mineral.id;
		this.colorCode = colorCode;
	}

	static run(creep: Creep, action: ExtractAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const mineral: Mineral|undefined = Game.getObjectById(action.mineralId) || undefined;
		if (mineral) {
			const creepMineral = creep.carry[mineral.mineralType] || 0;
			if (mineral
				&& mineral.mineralAmount > 0
				&& (creepMineral < creep.carryCapacity || creep.carryCapacity == 0)
			) {
				const result: number = creep.harvest(mineral);
				if (result == OK || result == ERR_TIRED) {
					return true;
				} else if (result == ERR_NOT_IN_RANGE) {
					action.child = new MoveToRangeAction(
						Util.posOf(mineral),
						action.colorCode,
						1
					);
					return MoveToRangeAction.run(creep, action.child);
				} else {
					creep.say('#' + result + ' ' + ExtractAction.type);
					return result;
				}
			}
		}

		return false;
	}
}
