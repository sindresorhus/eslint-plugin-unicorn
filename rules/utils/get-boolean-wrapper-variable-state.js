import {combineBooleanStates, getPromisedTypeBooleanState, getTypeBooleanState} from './get-type-boolean-state.js';
import {getBaseTypes, isTypeParameterType} from './types.js';

const boolean = 'boolean';
const nonBoolean = 'non-boolean';
const unknown = 'unknown';

// ObjectFlags.Mapped from TypeScript.
const mappedTypeFlag = 32;

const isMappedType = type => (type.objectFlags % (mappedTypeFlag * 2)) >= mappedTypeFlag;

function getConfiguredMemberName(type, checker, wrappers, visitedTypes = new Set()) {
	if (!type) {
		return;
	}

	const nonNullableType = checker.getNonNullableType(type);
	if (nonNullableType !== type) {
		return getConfiguredMemberName(nonNullableType, checker, wrappers, visitedTypes);
	}

	if (visitedTypes.has(type)) {
		return;
	}

	visitedTypes.add(type);

	const typeNames = [
		type.symbol?.name,
		type.aliasSymbol?.name,
		type.target?.symbol?.name,
	];
	const memberName = typeNames
		.map(typeName => wrappers.get(typeName))
		.find(Boolean);
	if (memberName) {
		return memberName;
	}

	if (isTypeParameterType(type)) {
		return getConfiguredMemberName(type.getConstraint(), checker, wrappers, visitedTypes);
	}

	if (type.isIntersection()) {
		for (const constituentType of type.types) {
			const memberName = getConfiguredMemberName(constituentType, checker, wrappers, visitedTypes);
			if (memberName) {
				return memberName;
			}
		}
	}

	if (isMappedType(type)) {
		for (const typeArgument of type.aliasTypeArguments ?? []) {
			const memberName = getConfiguredMemberName(typeArgument, checker, wrappers, visitedTypes);
			if (memberName) {
				return memberName;
			}
		}
	}

	for (const baseType of getBaseTypes(type, checker)) {
		const memberName = getConfiguredMemberName(baseType, checker, wrappers, visitedTypes);
		if (memberName) {
			return memberName;
		}
	}
}

function getBooleanValueState(type, checker) {
	const typeState = getTypeBooleanState(type, checker, new Set(), false);
	const promisedTypeState = getPromisedTypeBooleanState(type, checker);

	if (typeState === boolean || promisedTypeState === boolean) {
		return boolean;
	}

	return typeState === nonBoolean || promisedTypeState === nonBoolean ? nonBoolean : unknown;
}

function getBooleanWrapperMemberState(type, memberName, checker) {
	const member = checker.getPropertyOfType(type, memberName);
	if (!member) {
		return nonBoolean;
	}

	const memberType = checker.getTypeOfPropertyOfType(type, memberName);
	if (!memberType) {
		return nonBoolean;
	}

	const signatures = memberType.getCallSignatures();
	return signatures.length > 0
		? combineBooleanStates(signatures.map(signature => getBooleanValueState(signature.getReturnType(), checker)))
		: getBooleanValueState(memberType, checker);
}

function getBooleanWrapperTypeState(type, checker, wrappers) {
	if (!type) {
		return unknown;
	}

	const nonNullableType = checker.getNonNullableType(type);
	if (nonNullableType !== type) {
		return getBooleanWrapperTypeState(nonNullableType, checker, wrappers);
	}

	if (type.isUnion()) {
		return combineBooleanStates(type.types.map(type => getBooleanWrapperTypeState(type, checker, wrappers)));
	}

	const memberName = getConfiguredMemberName(type, checker, wrappers);
	if (!memberName) {
		return unknown;
	}

	return getBooleanWrapperMemberState(type, memberName, checker);
}

function getBooleanWrapperVariableState({variable, definition, context, wrappers}) {
	if (
		wrappers.size === 0
		|| !definition
		|| !['Variable', 'Parameter'].includes(definition.type)
		|| variable.references.some(reference => !reference.init && reference.isWrite())
	) {
		return unknown;
	}

	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		return getBooleanWrapperTypeState(
			parserServices.getTypeAtLocation(definition.name),
			parserServices.program.getTypeChecker(),
			wrappers,
		);
	} catch {
		return unknown;
	}
}

export {getBooleanWrapperVariableState};
