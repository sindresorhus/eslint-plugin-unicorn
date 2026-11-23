import {getStaticStringValue, isMethodCall} from '../ast/index.js';

export const arrayMethodsWithTypePredicates = new Set([
	'every',
	'filter',
	'find',
	'findLast',
]);

export const arrayPredicateMethods = new Set([
	...arrayMethodsWithTypePredicates,
	'findIndex',
	'findLastIndex',
	'some',
]);

export function getArrayPredicateMethod(callback) {
	const call = callback?.parent;
	if (!isMethodCall(call, {minimumArguments: 1, maximumArguments: 2}) || call.arguments[0] !== callback) {
		return;
	}

	const {computed, property} = call.callee;
	const method = !computed && property.type === 'Identifier' ? property.name : getStaticStringValue(property);
	if (arrayPredicateMethods.has(method)) {
		return method;
	}
}
