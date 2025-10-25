import toEslintFixer from './to-eslint-rule-fixer.js';

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
