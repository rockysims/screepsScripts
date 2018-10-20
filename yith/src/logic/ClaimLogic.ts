import SpawnRequest from 'SpawnRequest';
import Util from "util/Util";
import All from "All";
import Action from "action/Action";

export default class ClaimLogic {
	static onTick() {
		const claimFlags = this.getClaimFlags();
		if (claimFlags.length <= 0) return;

		Memory['claim'] = Memory['claim'] || {};
		const claimMem = Memory['claim'];

		if (claimMem['claimerId'] && !Game.getObjectById(claimMem['claimerId'])) delete claimMem['claimerId'];

		//try to set claimMem['claimerId'] && claimer
		if (!claimMem['claimerId']) {
			const claimerFound = Util.filterByRole(All.creeps(), 'claimer')[0];
			if (claimerFound) claimMem['claimerId'] = claimerFound.id;
		}
		const claimer = Game.getObjectById(claimMem['claimerId']) as Creep;

		if (claimer) {
			if (!Action.continue(claimer)) {
				//set claimFlag
				let flags = claimFlags.filter(flag => flag.pos.roomName == claimer.room.name);
				if (flags.length <= 0) flags = claimFlags;
				const flag = flags.sort((a, b) => {
					return claimer.pos.getRangeTo(a) - claimer.pos.getRangeTo(b); //closest first
				})[0];

				if (claimer.room.name != flag.pos.roomName) {
					Action.moveToRange(claimer, flag, '#ffff00', 1);
				} else {
					let target: StructureController|undefined = (flag.room || {controller: undefined}).controller;
					if (target && !Util.ownedByMe(target)) {
						Action.claim(claimer, target);
					} else {
						if (claimFlags.length == 1) claimer.suicide();
						flag.remove();
					}
				}
			}
		}
	}

	static run(room: Room) {
		!!room;
	}

	static generateSpawnRequest(room: Room): SpawnRequest {
		!!room;
		const claimFlags = this.getClaimFlags();
		const countByRole: {[role: string]: number} = Util.countByRole(All.creeps(true));
		const claimerCount = countByRole['claimer'] || 0;

		const requestSpawn = claimFlags.length > 0 && claimerCount <= 0;
		if (requestSpawn) {
			return {
				priority: 1,
				generateBody: (energyAvailable: number): BodyPartConstant[] => {
					return Util.generateBodyFromSet([CLAIM, MOVE], energyAvailable, 1);
				},
				memory: {role: 'claimer'}
			};
		} else {
			return {
				priority: 0,
				generateBody: () => [],
				memory: {role: 'none'}
			};
		}
	}

	static getClaimFlags(): Flag[] {
		const regex = '^claim';
		return Object.keys(Game.flags)
			.filter(name => name.match(regex))
			.map(name => Game.flags[name]);
	}
}