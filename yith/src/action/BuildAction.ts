import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import Util from 'util/Util';

export default class BuildAction extends AbstractAction {
	static type: string = 'build';
	constructionSiteId: string;
	child: MoveToRangeAction|undefined;

	constructor(constructionSite: ConstructionSite) {
		super(BuildAction.type);
		this.constructionSiteId = constructionSite.id;
	}

	static run(creep: Creep, action: BuildAction): boolean|number {
		if (action.child) {
			const result = MoveToRangeAction.run(creep, action.child);
			if (result !== false) return result;
			else action.child = undefined;
		}

		const constructionSite: ConstructionSite|undefined = Game.getObjectById(action.constructionSiteId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (constructionSite && creepEnergy > 0) {
			const result: number = creep.build(constructionSite);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				action.child = new MoveToRangeAction(
					Util.posOf(constructionSite),
					'#5555ff',
					3
				);
				return MoveToRangeAction.run(creep, action.child);
			} else {
				creep.say('#' + result + ' ' + BuildAction.type);
				return result;
			}
		}

		return false;
	}
}