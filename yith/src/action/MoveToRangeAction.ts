import AbstractAction from 'action/AbstractAction';
import All from 'All';

export default class MoveToRangeAction extends AbstractAction {
	static type: string = 'moveToRange';
	target: RoomPosition;
	colorCode: string;
	range: number;
	opts: Partial<MoveToOpts>|null;
	pathFinderPath: PathFinderPath|null;

	constructor(target: RoomPosition, colorCode: string, range: number, opts?: Partial<MoveToOpts>) {
		super(MoveToRangeAction.type);
		this.target = target;
		this.colorCode = colorCode;
		this.range = range;
		this.opts = opts || null;
		this.pathFinderPath = null;
	}

	static run(creep: Creep, action: MoveToRangeAction): boolean|number {
		const at = action.target;
		const pos: RoomPosition = new RoomPosition(at.x, at.y, at.roomName);
		const opts = Object.assign({
			reusePath: Math.min(Math.ceil(All.creeps().length * 0.34), 5),
			visualizePathStyle: {stroke: action.colorCode}
		}, action.opts || {});
		const isMultiRoomMove = creep.pos.roomName !== pos.roomName;

		if (!creep.pos.inRangeTo(pos, action.range)) {
			let nextPos = pos;

			if (isMultiRoomMove) {
				if (!action.pathFinderPath) {
					const pathFinderOpts: Partial<PathFinderOpts> = {
						//specifying roomCallback prevents traversing rooms without vision (no creep in room && no observer nearby)
						//	however not specifying roomCallback means everything except terrain is ignored (including constructed walls)
						// roomCallback: function(roomName: string) {
						// 	const room = Game.rooms[roomName];
						// 	console.log('roomCallback() start. roomName: ' + roomName + ' ' + ((!!room)?'T':'F'));
						// 	if (!room) return false;
						// 	const costs = new PathFinder.CostMatrix;
						//
						// 	room.find(FIND_STRUCTURES).forEach(function(struct) {
						// 		if (struct.structureType !== STRUCTURE_CONTAINER &&
						// 			(struct.structureType !== STRUCTURE_RAMPART || !struct.my)
						// 		) {
						// 			// Can't walk through non-walkable buildings
						// 			costs.set(struct.pos.x, struct.pos.y, 0xff);
						// 		}
						// 	});
						//
						// 	return costs;
						// }
					};
					Object.assign(pathFinderOpts, opts);
					action.pathFinderPath = PathFinder.search(creep.pos, pos, pathFinderOpts);
					// console.log('action.pathFinderPath.ops: ', JSON.stringify(action.pathFinderPath.ops));
					// console.log('action.pathFinderPath.incomplete: ', JSON.stringify(action.pathFinderPath.incomplete));

					let curRoomName = creep.pos.roomName;
					const roomSteps: RoomPosition[] = [];
					for (let pathPos of action.pathFinderPath.path) {
						if (pathPos.roomName !== curRoomName) {
							curRoomName = pathPos.roomName;
							roomSteps.push(pathPos);
						}
					}
					// console.log('roomSteps: ', JSON.stringify(roomSteps));
					(action.pathFinderPath as any)['roomSteps'] = roomSteps;
				}

				const roomSteps = (action.pathFinderPath)
					? (action.pathFinderPath as any)['roomSteps'] as RoomPosition[]
					: [];
				if (roomSteps.length > 0 && roomSteps[0].roomName === creep.pos.roomName) {
					roomSteps.shift(); //arrived so continue to next roomStep
				}
				nextPos = roomSteps[0] || pos;
				nextPos = new RoomPosition(nextPos.x, nextPos.y, nextPos.roomName);
				// if (isMultiRoomMove) console.log(creep.name + ' nextPos: ', JSON.stringify(nextPos));
			}

			const result = creep.moveTo(nextPos, opts);
			if (result == OK) {
				return true;
			} else if (result == ERR_TIRED) {
				return true;
			} else {
				creep.say('#' + result + ' ' + MoveToRangeAction.type);
				return result;
			}
		}

		return false;
	}
}