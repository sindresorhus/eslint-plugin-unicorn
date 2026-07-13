const isIterable = object => typeof object?.[Symbol.iterator] === 'function';

/**
@import * as ESLint from 'eslint';
@import {UnicornReportFixer} from './to-eslint-rule-fixer.js';
@import {UnicornProblems, UnicornProblem} from './to-eslint-problem.js';
*/

/**
Call `callback` for each ESLint fix or ESLint problem in `value`, flattening nested iterables.

This runs for every listener call of every rule, so it deliberately avoids generators and intermediate arrays.

@template {UnicornReportFixer | UnicornProblems} ValueType

@param {ValueType} value
@param {(value: ValueType extends UnicornReportFixer ? ESLint.Rule.Fix : UnicornProblem) => void} callback
@returns {void}
*/
export function forEachFixOrProblem(value, callback) {
	if (!isIterable(value)) {
		callback(value);
		return;
	}

	for (const element of value) {
		forEachFixOrProblem(element, callback);
	}
}
