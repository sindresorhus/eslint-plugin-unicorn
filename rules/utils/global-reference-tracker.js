'use strict';
const {ReferenceTracker} = require('eslint-utils');

const createTraceMap = object => {
	let map = {[ReferenceTracker.READ]: true};

	const path = object.split('.').reverse();
	for (const name of path) {
		map = {[name]: map};
	}

	return map;
};

class GlobalReferenceTracker {
	#traceMap = {};
	#filter;
	#handle;

	constructor({
		object,
		objects = [object],
		filter,
		handle,
	}) {
		for (const object of objects) {
			Object.assign(this.#traceMap, createTraceMap(object));
		}

		this.#filter = filter;
		this.#handle = handle;
	}

	* track({globalScope}) {
		const tracker = new ReferenceTracker(globalScope);

		for (const reference of tracker.iterateGlobalReferences(this.#traceMap)) {
			if (this.#filter && !this.#filter(reference)) {
				continue;
			}

			const problems = this.#handle(reference);

			if (!problems) {
				continue;
			}

			if (problems[Symbol.iterator]) {
				yield * problems;
			} else {
				yield problems;
			}
		}
	}
}

module.exports = {
	GlobalReferenceTracker,
};
