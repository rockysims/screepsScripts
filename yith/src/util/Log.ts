export default class Log {
	static log(s: string) {
		console.log(s);
	}
	static warn(s: string) {
		console.log('WARNING: ' + s);
	}
}