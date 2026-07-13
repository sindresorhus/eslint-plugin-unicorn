import {forEachFixOrProblem} from './utilities.js';
import toEslintProblem from './to-eslint-problem.js';

/**
@import * as ESLint from 'eslint';
@import {UnicornContext} from './unicorn-context.js'
@import {UnicornProblems} from './to-eslint-problem.js'
*/

/**
@typedef {ESLint.Rule.RuleListener} EslintListers
@typedef {keyof EslintListers} ListenerType
@typedef {EslintListers[ListenerType]} EslintListener
@typedef {(...listenerArguments: Parameters<EslintListener>) => UnicornProblems} UnicornRuleListen
*/

/**
@param {UnicornContext} context
@param {UnicornRuleListen[]} listeners
@returns {EslintListener}
*/
export default function toEslintListener(context, listeners) {
	const reportProblem = unicornProblem => {
		if (unicornProblem) {
			context.report(toEslintProblem(unicornProblem));
		}
	};

	/*
	Declared with fixed arity rather than rest arguments, since this runs for every node visit of every rule and a per-call rest array is measurable.
	Three parameters cover every ESLint listener signature, the widest being `onCodePathSegmentLoop(fromSegment, toSegment, node)`.
	*/
	return (first, second, third) => {
		for (const listener of listeners) {
			const unicornProblems = listener(first, second, third);

			// Listeners report nothing on the vast majority of nodes, so keep that path free of iterator allocation.
			if (!unicornProblems) {
				continue;
			}

			forEachFixOrProblem(unicornProblems, reportProblem);
		}
	};
}
