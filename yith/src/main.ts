/// <reference path="../../typings/index.d.ts" />

import o from 'other';
import s from 'folder/subFolder/sub';

export const loop = function(): void {
	//commit latest work to git
	//add typings.d.ts for screeps

	console.log('loop()');
	o();
	s();

	let creeps: {
		[creepName: string]: Creep;
	} = Game.creeps;



	//act.go(creeps[0], target);
	//creeps[0].doExt();

	console.log('abc');
};