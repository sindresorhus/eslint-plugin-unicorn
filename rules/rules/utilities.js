const isIterable = object => typeof object?.[Symbol.iterator] === 'function';

/**
@import * as ESLint from 'eslint';
@import {UnicornReportFixer} from './to-eslint-rule-fixer.js';
*/

/**
Iterate ESLint fix or ESLint problem

@template {UnicornReportFixer} ValueType
@template {ESLint.Fix} ReturnType

@param {ValueType} value
@returns {ReturnType}
*/
export function * flatFixOrProblem(value) {
	if (!value) {
		return;
	}

	if (!isIterable(value)) {
		yield value;
		return;
	}

	for (const element of value) {
		yield * flatFixOrProblem(element);
	}
}

