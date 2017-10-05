import AbstractAction from 'action/AbstractAction';
import All from 'All';

export default class MoveToRangeAction extends AbstractAction {
	static type: string = 'moveToRange';
	target: RoomPosition;
	colorCode: string;
	range: number;

	constructor(target: RoomPosition, colorCode: string, range: number) {
		super(MoveToRangeAction.type);
		this.target = target;
		this.colorCode = colorCode;
		this.range = range;
	}

	static run(creep: Creep, action: MoveToRangeAction): boolean {
		console.log('b');
		const at = action.target;
		const pos: RoomPosition = new RoomPosition(at.x, at.y, at.roomName);
		if (!creep.pos.inRangeTo(pos, action.range)) {
			console.log('b if {} start');
			const result: number = creep.moveTo(pos, {
				reusePath: Math.min(Math.ceil(All.creeps().length * 0.4), 5),
				visualizePathStyle: {stroke: action.colorCode}
			});
			if (result == OK) {
				console.log('b ok');
				return true;
			} else if (result == ERR_TIRED) {
				console.log('b tired');
				return true;
			} else {
				creep.say('#' + result + ' ' + MoveToRangeAction.type);
				console.log('b #' + result);
				return false;
			}
		}

		console.log('b end');
		return false;
	}
}