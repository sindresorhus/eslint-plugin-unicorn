import {ReferenceTracker} from '@eslint-community/eslint-utils';

const createTraceMap = (object, type) => {
	let map = {[type]: true};

	const path = object.split('.').toReversed();
	for (const name of path) {
		map = {[name]: map};
	}

	return map;
};

export class GlobalReferenceTracker {
	#traceMap = {};
	#context;
	#filter;
	#handle;

	constructor({
		object,
		objects = [object],
		type = ReferenceTracker.READ,

		context,
		filter,
		handle,
	}) {
		for (const object of objects) {
			Object.assign(this.#traceMap, createTraceMap(object, type));
		}

		this.#context = context;
		this.#filter = filter;
		this.#handle = handle;
	}

	* #track(globalScope, options) {
		const context = options?.context ?? this.#context;
		const filter = options?.filter ?? this.#filter;
		const handle = options?.handle ?? this.#handle;
		const tracker = new ReferenceTracker(globalScope);

		for (const reference of tracker.iterateGlobalReferences(this.#traceMap)) {
			if (filter && !filter(reference)) {
				continue;
			}

			const problems = handle(reference, context);

			yield problems;
		}
	}

	listen(options) {
		const context = options?.context ?? this.#context;
		context.onExit(
			'Program',
			program => this.#track(context.sourceCode.getScope(program), options),
		);
	}
}

Object.assign(GlobalReferenceTracker, {
	READ: ReferenceTracker.READ,
	CALL: ReferenceTracker.CALL,
	CONSTRUCT: ReferenceTracker.CONSTRUCT,
});
