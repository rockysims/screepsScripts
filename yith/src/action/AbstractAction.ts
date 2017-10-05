export default abstract class AbstractAction {
	type: string;

	constructor(type: string) {
		this.type = type;
	}
}