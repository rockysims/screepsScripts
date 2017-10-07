import AbstractAction from 'action/AbstractAction';
import MoveToRangeAction from 'action/MoveToRangeAction';
import HarvestAction from 'action/HarvestAction';
import CollectAction from 'action/CollectAction';
import PickupAction from 'action/PickupAction';
import DeliverAction from 'action/DeliverAction';
import UpgradeAction from 'action/UpgradeAction';
import BuildAction from 'action/BuildAction';

export default class Continue {
	static action(creep: Creep): boolean {
		//TODO: delete inActionContinue stuff? at least add console.log() when it prevents a problem
		if (creep.memory['inActionContinue']) return true;
		creep.memory['inActionContinue'] = true;

		try {
			creep.memory['actions'] = creep.memory['actions'] || [];
			const actions:AbstractAction[] = creep.memory['actions'];
			console.log(creep.name + ' continue() actions: ', JSON.stringify(actions));
			while (actions.length > 0) {
				const action = actions[actions.length - 1];

				let continueAction = false;
				console.log('Executing: ' + action.type);
				if (action.type == MoveToRangeAction.type)
					continueAction = MoveToRangeAction.run(creep, action as MoveToRangeAction);
				else if (action.type == HarvestAction.type)
					continueAction = HarvestAction.run(creep, action as HarvestAction);
				else if (action.type == CollectAction.type)
					continueAction = CollectAction.run(creep, action as CollectAction);
				else if (action.type == PickupAction.type)
					continueAction = PickupAction.run(creep, action as PickupAction);
				else if (action.type == DeliverAction.type)
					continueAction = DeliverAction.run(creep, action as DeliverAction);
				else if (action.type == UpgradeAction.type)
					continueAction = UpgradeAction.run(creep, action as UpgradeAction);
				else if (action.type == BuildAction.type)
					continueAction = BuildAction.run(creep, action as BuildAction);
				//console.log(action.type + ' continue() continueAction: ', continueAction);
				if (continueAction) {
					return true;
				} else {
					console.log('finished and removing actions after: ' + action.type);
					//actions.splice(actions.indexOf(action), 1); //TODO: delete (or switch back? probably not)
					console.log('!spliced actions: ', JSON.stringify(actions));
					const actionIndex = actions.indexOf(action);
					actions.splice(actionIndex, actions.length - actionIndex);
					console.log('spliced actions:  ', JSON.stringify(actions));
				}
			}

			console.log('a return false at end');
			return false;
		} finally {
			creep.memory['inActionContinue'] = false;
		}
	}

	//static continue(creep: Creep): boolean {
	//	console.log('a');
	//
	//	creep.memory['actions'] = creep.memory['actions'] || [];
	//	const actions: AbstractAction[] = creep.memory['actions'];
	//	//if (true || creep.name == 'Claire')
	//	//	console.log(creep.name + ' continue() actions: ', JSON.stringify(actions));
	//	while (actions.length > 0) {
	//		const action = actions[actions.length-1];
	//
	//		let success = false;
	//		console.log('Executing: ' + action.type);
	//		if (action.type == MoveToRangeAction.type)
	//			success = MoveToRangeAction.run(creep, action as MoveToRangeAction);
	//		else if (action.type == HarvestAction.type)
	//			success = HarvestAction.run(creep, action as HarvestAction);
	//		else if (action.type == CollectAction.type)
	//			success = CollectAction.run(creep, action as CollectAction);
	//		else if (action.type == PickupAction.type)
	//			success = PickupAction.run(creep, action as PickupAction);
	//		else if (action.type == DeliverAction.type)
	//			success = DeliverAction.run(creep, action as DeliverAction);
	//		else if (action.type == UpgradeAction.type)
	//			success = UpgradeAction.run(creep, action as UpgradeAction);
	//		else if (action.type == BuildAction.type)
	//			success = BuildAction.run(creep, action as BuildAction);
	//		//if (true || creep.name == 'Claire')
	//		//	console.log(action.type + ' continue() success: ', success);
	//		if (!success) {
	//			console.log('action.pop()');
	//			actions.pop();
	//		}
	//		else return true;
	//	}
	//
	//	console.log('a return false at end');
	//	return false;
	//}
}