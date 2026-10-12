import {isUnknownType, withTypeInformation} from './types.js';

/**
Check whether `node` has a known non-promise type when full TypeScript type information is available.
*/
export function isKnownNonPromise(node, context) {
	return withTypeInformation(node, context, ({type, checker}) => isPromiseType(type, checker) === false) ?? false;
}

// Best-effort check whether a TypeScript type is a promise. Returns `true`/`false` when known, `undefined` when indeterminate.
export default function isPromiseType(type, checker) {
	if (isUnknownType(type)) {
		return;
	}

	type = checker.getNonNullableType(type);

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
