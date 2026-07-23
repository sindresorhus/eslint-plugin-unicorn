import {isNullishType, isTypeParameterType, isUnknownType} from './types.js';

const boolean = 'boolean';
const nonBoolean = 'non-boolean';
const unknown = 'unknown';

function combineBooleanStates(states) {
	if (
		states.length === 0
		|| states.includes(unknown)
	) {
		return unknown;
	}

	return states.every(state => state === boolean) ? boolean : nonBoolean;
}

function getTypeBooleanState(type, checker, visitedTypes = new Set(), functionTypesAreBoolean = true) {
	if (!type) {
		return unknown;
	}

	if (
		isUnknownType(type)
		|| type.intrinsicName === 'never'
	) {
		return unknown;
	}

	if (visitedTypes.has(type)) {
		return unknown;
	}

	visitedTypes.add(type);

	if (isTypeParameterType(type)) {
		const constraint = type.getConstraint();
		const result = constraint ? getTypeBooleanState(constraint, checker, visitedTypes, functionTypesAreBoolean) : unknown;
		visitedTypes.delete(type);
		return result;
	}

	const nonNullableType = checker.getNonNullableType(type);
	if (nonNullableType !== type) {
		const result = getTypeBooleanState(nonNullableType, checker, visitedTypes, functionTypesAreBoolean);
		visitedTypes.delete(type);
		return result;
	}

	if (type.isUnion()) {
		const result = combineBooleanStates(
			type.types
				.filter(type => !isNullishType(type))
				.map(type => getTypeBooleanState(type, checker, visitedTypes, functionTypesAreBoolean)),
		);
		visitedTypes.delete(type);
		return result;
	}

	const signatures = type.getCallSignatures();
	if (signatures.length > 0) {
		const result = functionTypesAreBoolean
			? combineBooleanStates(signatures.map(signature => getTypeBooleanState(signature.getReturnType(), checker, visitedTypes, false)))
			: nonBoolean;
		visitedTypes.delete(type);
		return result;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		const result = getTypeBooleanState(constraint, checker, visitedTypes, functionTypesAreBoolean);
		visitedTypes.delete(type);
		return result;
	}

	if (type.getProperties().length === 0) {
		visitedTypes.delete(type);
		return unknown;
	}

	const typeString = checker.typeToString(checker.getWidenedType(checker.getBaseTypeOfLiteralType(type)));
	visitedTypes.delete(type);

	return typeString === boolean ? boolean : nonBoolean;
}

function getPromisedTypeBooleanState(type, checker) {
	const promisedType = checker.getPromisedTypeOfPromise(type);
	return promisedType ? getTypeBooleanState(promisedType, checker, new Set(), false) : unknown;
}

export {combineBooleanStates, getPromisedTypeBooleanState, getTypeBooleanState};
