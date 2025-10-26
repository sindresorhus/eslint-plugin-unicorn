import toEslintFixer from './to-eslint-rule-fixer.js';

/**
@import * as ESLint from 'eslint';
*/

/**
@typedef {Parameters<ESLint.Rule.RuleContext['report']>[0]} EslintProblem
@typedef {EslintProblem} UnicornProblem
@typedef {EslintProblem | undefined | EslintProblem[] | IterableIterator<EslintProblem>} UnicornProblems
*/

/**
@param {UnicornProblem} unicornProblem
@returns {EslintProblem}
*/
function toEslintProblem(unicornProblem) {
	const eslintProblem = {...unicornProblem};

	if (unicornProblem.fix) {
		eslintProblem.fix = toEslintFixer(unicornProblem.fix);
	}

	if (Array.isArray(unicornProblem.suggest)) {
		eslintProblem.suggest = unicornProblem.suggest.map(unicornSuggest => {
			const eslintSuggest = {...unicornSuggest};
			eslintSuggest.fix = toEslintFixer(unicornSuggest.fix);
			eslintSuggest.data = {
				...unicornProblem.data,
				...unicornSuggest.data,
			};

			return eslintSuggest;
		});
	}

	return eslintProblem;
}

export default toEslintProblem;
