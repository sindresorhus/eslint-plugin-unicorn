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

function traceGlobalObjects({
	object,
	objects = [object],
	filter,
	handle,
}) {
	const traceMap = {};

	for (const object of objects) {
		Object.assign(traceMap, createTraceMap(object));
	}

	return context => ({
		* 'Program:exit'() {
			const tracker = new ReferenceTracker(context.getScope());

			for (const reference of tracker.iterateGlobalReferences(traceMap)) {
				if (filter && !filter(reference)) {
					continue;
				}

				const problems = handle(reference);

				if (!problems) {
					continue;
				}

				if (problems[Symbol.iterator]) {
					yield * problems;
				} else {
					yield problems;
				}
			}
		},
	});
}

module.exports = traceGlobalObjects;
