import o from 'other';
import s from 'folder/subFolder/sub';

export const loop = function() {
	console.log('loop()');
	o();
	s();

	console.log('abc');
};