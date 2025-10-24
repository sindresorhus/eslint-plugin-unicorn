import {iterateFixOrProblems} from './utilities.js';

/**
@import * as ESLint from 'eslint';
*/

class FixAbortError extends Error {
	name = 'FixAbortError';
}

const fixOptions = {
	abort() {
		throw new FixAbortError('Fix aborted.');
	},
};

/**
@typedef {ESLint.Rule.ReportFixer | undefined} EslintReportFixer
@typedef {EslintReportFixer | IterableIterator<EslintReportFixer>} UnicornReportFixer
@typedef {(fixer: ESLint.Rule.RuleFixer, options: typeof fixOptions) => } UnicornRuleFixer
*/

/**
Convert Unicorn style fix function to ESLint style fix function

@param {UnicornRuleFixer} fix
@returns {ESLint.Rule.RuleFixer}
*/
function toEslintRuleFixer(fix) {
	return fixer => {
		/** @type {UnicornReportFixer} */
		const unicornReport = fix(fixer, fixOptions);

		/** @type {IterableIterator<ESLint.Rule.Fix>} */
		const eslintReport = iterateFixOrProblems(unicornReport);

		try {
			return [...eslintReport];
		} catch (error) {
			if (error instanceof FixAbortError) {
				return;
			}

			/* c8 ignore next */
			throw error;
		}
	};
}

export default toEslintRuleFixer;
