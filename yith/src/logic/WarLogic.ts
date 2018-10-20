import SpawnRequest from 'SpawnRequest';
import Util from "util/Util";
import All from "All";
import Action from "action/Action";

export default class WarLogic {
	static onTick() {
		const warDestroyFlags = this.getWarFlags('destroy');
		if (warDestroyFlags.length <= 0) return;

		Memory['war'] = Memory['war'] || {};
		const warMem = Memory['war'];

		if (warMem['warTankId'] && !Game.getObjectById(warMem['warTankId'])) delete warMem['warTankId'];
		if (warMem['warHealId'] && !Game.getObjectById(warMem['warHealId'])) delete warMem['warHealId'];

		const creeps = All.creeps();

		//try to set warMem['warTankId'] && warTank
		if (!warMem['warTankId']) {
			const warTankFound = Util.filterByRole(creeps, 'warTank')[0];
			if (warTankFound) warMem['warTankId'] = warTankFound.id;
		}
		const warTank = Game.getObjectById(warMem['warTankId']) as Creep;

		//try to set warMem['warHealId'] && warHeal
		if (!warMem['warHealId']) {
			const warHealFound = Util.filterByRole(creeps, 'warHeal')[0];
			if (warHealFound) warMem['warHealId'] = warHealFound.id;
		}
		const warHeal = Game.getObjectById(warMem['warHealId']) as Creep;

		if (warTank && warHeal) {
			//tick warTank
			if (!Action.continue(warTank)) {
				if (warTank.pos.getRangeTo(warHeal) <= 1) {
					//set destroyFlag
					let destroyFlags = warDestroyFlags.filter(flag => flag.pos.roomName == warTank.room.name);
					if (destroyFlags.length <= 0) destroyFlags = warDestroyFlags;
					const destroyFlag = destroyFlags.sort((a, b) => {
						return warTank.pos.getRangeTo(a) - warTank.pos.getRangeTo(b); //closest first
					})[0];

					try {
						//set target
						let target: Structure|Creep|undefined = destroyFlag.pos.lookFor(LOOK_STRUCTURES)[0];
						if (!target) {
							target = destroyFlag.pos.lookFor(LOOK_CREEPS)
								.filter(creep => !creep.my)[0];
						}

						//attack target or remove flag
						if (target) {
							Action.attack(warTank, target);
							Action.continue(warTank);
						} else {
							destroyFlag.remove();
						}
					} catch (e) {
						Action.moveToRange(warTank, destroyFlag, '#006600', 1);
					}
				}
			}

			//tick warHeal
			if (!Action.continue(warHeal)) {
				if (warTank.hits < warTank.hitsMax) {
					Action.heal(warHeal, warTank);
				} else if (warHeal.hits < warHeal.hitsMax) {
					Action.heal(warHeal, warHeal);
				} else {
					if (warTank.pos.getRangeTo(warHeal) <= 1 && Util.isRoomExit(warHeal.pos)) {
						const nonRoomExitsAdjacentToWarTank = Util.getAdjacent8(warTank).filter(pos => !Util.isRoomExit(pos));
						const moveToTarget = warHeal.pos.findClosestByPath(nonRoomExitsAdjacentToWarTank);
						if (moveToTarget) Action.moveToRange(warHeal, moveToTarget, '#006600', 0);
					} else {
						//move warHeal to warTank
						Action.moveToRange(warHeal, warTank, '#006600', 0);
					}
				}
				Action.continue(warHeal);
			}
		} else {
			if (warTank) Action.idle(warTank);
			if (warHeal) {
				if (warHeal.hits < warHeal.hitsMax) {
					Action.heal(warHeal, warHeal);
					Action.continue(warTank);
				} else {
					Action.idle(warHeal);
				}
			}
		}
	}

	static run(room: Room) {
		!!room;
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		!!room;
		const warFlags = this.getWarFlags('destroy');
		const countByRole: {[role: string]: number} = Util.countByRole(All.creeps(true));
		const warTankCount = countByRole['warTank'] || 0;
		const warHealCount = countByRole['warHeal'] || 0;

		const requestHealSpawn = warFlags.length > 0 && warHealCount <= 0;
		const requestTankSpawn = warFlags.length > 0 && warTankCount <= 0;
		if (requestHealSpawn) {
			return {
				priority: 2,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {


					//TODO: switch back to other version
					return Util.generateBodyFromSet([HEAL, MOVE], energyAvailable, 1);
					// return Util.generateBodyFromSet([HEAL, MOVE], energyAvailable);



				},
				memory: {role: 'warHeal'}
			};
		} else if (requestTankSpawn) {
			return {
				priority: 7,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
					//TODO: switch back to other version
					return Util.generateBodyFromSet([MOVE, ATTACK, ATTACK], energyAvailable, null, true);
					// return Util.generateBodyFromSet([TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK], energyAvailable, null, true);
				},
				memory: {role: 'warTank'}
			};
		} else {
			return {
				priority: 0,
				generateBody: () => [],
				memory: {role: 'none'}
			};
		}
	}

	static getWarFlags(type?: string): Flag[] {
		const regex = '^war:' + (type || '');
		return Object.keys(Game.flags)
			.filter(name => name.match(regex))
			.map(name => Game.flags[name]);
	}
}