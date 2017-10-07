import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import ActionQ from 'action/ActionQ';
import Util from 'util/Util';

export default class BuildAction extends AbstractAction {
	static type: string = 'build';
	constructionSiteId: string;

	constructor(constructionSite: ConstructionSite) {
		super(BuildAction.type);
		this.constructionSiteId = constructionSite.id;
	}

	static run(creep: Creep, action: BuildAction): boolean {
		const constructionSite: ConstructionSite|undefined = Game.getObjectById(action.constructionSiteId) || undefined;
		const creepEnergy = creep.carry.energy || 0;
		if (constructionSite && creepEnergy > 0) {
			const result: number = creep.build(constructionSite);
			if (result == OK) {
				return true;
			} else if (result == ERR_NOT_IN_RANGE) {
				ActionQ.push(creep, new MoveToRangeAction(
					Util.posOf(constructionSite),
					'#5555ff',
					1
				));
				return true;
			} else {
				creep.say('#' + result + ' ' + BuildAction.type);
				return false;
			}
		}

		return false;
	}
}