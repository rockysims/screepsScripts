import Log from "util/Log";

export default class Timer {
	static timestamps: {[s: string]: number} = {};

	static start(key: string) {
		const wasAlreadyStarted = !!this.timestamps[key];

		this.timestamps[key] = new Date().getTime();

		if (wasAlreadyStarted) {
			Log.warn("Timer \"" + key + "\" started. WAS ALREADY STARTED");
		}
	}

	static end(key: string, silent?: boolean): number {
		if (this.timestamps[key]) {
			const start = this.timestamps[key];
			const end = new Date().getTime();
			const duration = end - start;
			delete this.timestamps[key];

			if (!silent) Log.log("Timer '" + key + "' total duration: " + duration + "ms.");
			return duration;
		} else {
			Log.warn("Timer \"" + key + "\" ended WITHOUT A DURATION");
			return 0;
		}
	}
}