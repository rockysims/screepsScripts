export default abstract class AbstractAction {
	type: string;

	constructor(type: string) {
		this.type = type;
	}

	/** Order creep to perform action.
	 *
	 * @param creep
	 * @returns {boolean|number}
	 * 	boolean: true if creep's action for this tick has been used up else false
	 * 	number: errorCode
	 */
	//abstract static run(creep: Creep, action: AbstractAction|undefined): boolean|number;
}