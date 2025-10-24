import {iterateFixOrProblems} from './utilities.js';
import toEslintProblem from './to-eslint-problem.js';

/**
@import * as ESLint from 'eslint';
*/

/**
@typedef {keyof ESLint.Rule.RuleListener} ListenerType
@typedef {value } Listener
@typedef {(type: ListenerType | ListenerType[], listener: Listener) => void} UnicornRuleListen

@typedef {ESLint & {
	on: UnicornRuleListen
	onExit: UnicornRuleListen
}} UnicornContext
*/

function toEslintListener(context, listener) {
	// Listener arguments can be `codePath, node` or `node`

	/*
	@typedef {Parameters<ESLint.Rule.RuleListener>}
 */
	return (...listenerArguments) => {
		const unicornProblems = listener(...listenerArguments);

		for (const unicornProblem of iterateFixOrProblems(unicornProblems)) {
			if (unicornProblem) {
				const eslintProblem = toEslintProblem(unicornProblem);
				context.report(eslintProblem);
			}
		}
	};
}

export default toEslintListener;
