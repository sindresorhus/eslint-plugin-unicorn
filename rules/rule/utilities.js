const isIterable = object => typeof object?.[Symbol.iterator] === 'function';

/**
@import * as ESLint from 'eslint';
@import {UnicornReportFixer} from './to-eslint-rule-fixer.js';
@import {UnicornProblems, UnicornProblem} from './to-eslint-problem.js';
*/

/**
Iterate ESLint fix or ESLint problem

@template {UnicornReportFixer | UnicornProblems} ValueType

@param {ValueType} value
@returns {IterableIterator<ValueType extends UnicornReportFixer ? ESLint.Rule.Fix : UnicornProblem>}
*/
export function * iterateFixOrProblems(value) {
	if (!isIterable(value)) {
		yield value;
		return;
	}

	for (const element of value) {
		yield * iterateFixOrProblems(element);
	}
}

