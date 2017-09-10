/// <reference path="../../typings/index.d.ts" />

import o from 'other';
import s from 'folder/subFolder/sub';

export const loop = function(): void {
	console.log('loop()');
	console.log('x: ' + o.x);
	s();

	//let creeps: {
	//	[creepName: string]: Creep;
	//} = Game.creeps;



	//act.go(creeps[0], target);
	//creeps[0].doExt();

	console.log('abc');
};