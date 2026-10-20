import {combineBooleanStates} from './get-type-boolean-state.js';
import {
	getJSDocumentType,
	getJSDocumentIntersectionMembers,
	nonTarget,
	target,
} from './type-helpers.js';

const booleanTypeNames = new Set(['boolean']);
const nonBooleanTypeNames = new Set(['Array', 'ReadonlyArray', 'Promise', 'PromiseLike']);

/**
Classify documented values using the naming rule's unknown, nullish, and callable policies.
*/
function getTypeBooleanState(type, {allowNullish, functionTypesAreBoolean}) {
	switch (type.kind) {
		case 'union': {
			const types = allowNullish ? type.elements.filter(element => element.kind !== 'nullish') : type.elements;
			return combineBooleanStates(types.map(element => getTypeBooleanState(element, {allowNullish, functionTypesAreBoolean})));
		}

		case 'intersection': {
			const members = getJSDocumentIntersectionMembers(type).filter(element => element.kind !== 'non-primitive');
			return members.length > 0
				? combineBooleanStates(members.map(element => getTypeBooleanState(element, {allowNullish, functionTypesAreBoolean})))
				: 'non-boolean';
		}

		case 'nullable':
		case 'optional': {
			return allowNullish ? getTypeBooleanState(type.element, {allowNullish, functionTypesAreBoolean}) : 'unknown';
		}

		case 'function': {
			return functionTypesAreBoolean
				? getTypeBooleanState(type.returnType, {allowNullish, functionTypesAreBoolean: false})
				: 'non-boolean';
		}

		default: {
			const state = getJSDocumentType({type}, {targetTypeNames: booleanTypeNames, nonTargetTypeNames: nonBooleanTypeNames});
			if (state === target) {
				return 'boolean';
			}

			return state === nonTarget ? 'non-boolean' : 'unknown';
		}
	}
}

/**
Classify a documented boolean value, with separate policies for nullable values and callable names.
*/
function getJSDocumentBooleanState(annotation, {allowNullish = false, functionTypesAreBoolean = false} = {}) {
	return annotation.optional && !allowNullish
		? 'unknown'
		: getTypeBooleanState(annotation.type, {allowNullish, functionTypesAreBoolean});
}

export {getJSDocumentBooleanState};
