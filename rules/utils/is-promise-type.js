import {isUnknownType} from './types.js';

// Best-effort check whether a TypeScript type is a promise. Returns `true`/`false` when known, `undefined` when indeterminate.
function isPromiseType(type, checker) {
	type = checker.getNonNullableType(type);

	if (isUnknownType(type)) {
		return;
	}

	if (type.isUnion()) {
		const results = type.types.map(type => isPromiseType(type, checker));

		if (results.every(Boolean)) {
			return true;
		}

		if (results.every(result => result === false)) {
			return false;
		}

		return;
	}

	return checker.getPromisedTypeOfPromise(type) !== undefined;
}

export default isPromiseType;
