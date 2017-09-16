import getAll from 'getAll';

export default class Util {
	static costOf(bodyParts: Array<string>): number {
		return bodyParts.reduce((carry: number, bodyPart: string) => carry + BODYPART_COST[bodyPart], 0);
	}

	static countByRole(creeps: Array<Creep>): {[role: string]: number} {
		let countByRole: {[role: string]: number} = {};
		creeps.forEach((creep: Creep) => {
			let role = creep.memory.role || '?';
			countByRole[role] = countByRole[role] || 0;
			countByRole[role]++;
		});
		return countByRole;
	}

	static creepsIn(room: Room): Creep[] {
		let all = getAll();
		return all.creeps
			.filter((creep: Creep) => creep.room.name == room.name);
	}
}