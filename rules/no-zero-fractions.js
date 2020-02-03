'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ZERO_FRACTION = 'Don\'t use a zero fraction in the number.';
const MESSAGE_DANGLING_DOT = 'Don\'t use a dangling dot in the number.';

// Groups:
// 1. Integer part.
// 2. Dangling dot or dot with zeroes.
// 3. Dot with digits except last zeroes.
// 4. Scientific notation.
const RE_DANGLINGDOT_OR_ZERO_FRACTIONS = /^(?<integerPart>[+-]?\d*)(?:(?<dotAndZeroes>\.0*)|(?<dotAndDigits>\.\d*[1-9])0+)(?<scientificNotationSuffix>e[+-]?\d+)?$/;

const create = context => {
	return {
		Literal: node => {
			if (typeof node.value !== 'number') {
				return;
			}

			const match = RE_DANGLINGDOT_OR_ZERO_FRACTIONS.exec(node.raw);
			if (match === null) {
				return;
			}

			const {
				integerPart,
				dotAndZeroes,
				dotAndDigits,
				scientificNotationSuffix
			} = match.groups;

			const isDanglingDot = dotAndZeroes === '.';

			context.report({
				node,
				message: isDanglingDot ? MESSAGE_DANGLING_DOT : MESSAGE_ZERO_FRACTION,
				fix: fixer => {
					let wantedString = dotAndZeroes === undefined ? integerPart + dotAndDigits : integerPart;

					if (scientificNotationSuffix !== undefined) {
						wantedString += scientificNotationSuffix;
					}

					return fixer.replaceText(node, wantedString);
				}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
