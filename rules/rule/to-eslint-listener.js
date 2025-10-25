import {iterateFixOrProblems} from './utilities.js';
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
@param {UnicornRuleListen} listener
@returns {Listener}
*/
function toEslintListener(context, listener) {
	// Listener arguments can be `codePath, node` or `node`

	/**
	@type {UnicornRuleListen}
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
