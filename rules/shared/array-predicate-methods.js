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
