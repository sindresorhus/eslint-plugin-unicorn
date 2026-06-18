import {
	isMethodCall,
	getStaticStringValue,
	isNumericLiteral,
	isStringLiteral,
} from './ast/index.js';
import {isString} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-invalid-character-comparison';
const messages = {
	[MESSAGE_ID]: 'A single character can never equal the multi-character string `{{string}}`, so this comparison is always {{result}}.',
};

const equalityOperators = new Set(['==', '===', '!=', '!==']);

const isStaticStringIndex = node => {
	if (isNumericLiteral(node)) {
		return true;
	}

	if (!isStringLiteral(node)) {
		return false;
	}

	const index = Number(node.value);

	return Number.isSafeInteger(index) && index >= 0 && String(index) === node.value;
};

// Whether `node` evaluates to a single character (or `''`/`undefined` when out of bounds).
const isSingleCharacterAccess = (node, context) => {
	// `string.charAt(index)` — user-defined `charAt` methods can return any value, so the receiver must be a proven string.
	if (
		isMethodCall(node, {
			method: 'charAt',
			maximumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		&& isString(node.callee.object, context)
	) {
		return true;
	}

	// `string.at(index)` — arrays and typed arrays also have `at`, so the receiver must be a proven string.
	if (
		isMethodCall(node, {
			method: 'at',
			maximumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})
		&& isString(node.callee.object, context)
	) {
		return true;
	}

	// `string[index]` — computed access with a static numeric key, on a proven string.
	// Dynamic keys can resolve to regular string properties, such as `length`.
	return (
		node.type === 'MemberExpression'
		&& node.computed
		&& !node.optional
		&& isStaticStringIndex(node.property)
		&& isString(node.object, context)
	);
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('BinaryExpression', (/** @type {ESTree.BinaryExpression} */ node) => {
		if (!equalityOperators.has(node.operator)) {
			return;
		}

		for (const [accessSide, stringSide] of [[node.left, node.right], [node.right, node.left]]) {
			const string = getStaticStringValue(stringSide);

			if (
				string !== undefined
				&& string.length > 1
				&& isSingleCharacterAccess(accessSide, context)
			) {
				const isNegated = node.operator === '!==' || node.operator === '!=';

				return {
					node,
					messageId: MESSAGE_ID,
					data: {
						string,
						result: isNegated ? 'true' : 'false',
					},
				};
			}
		}
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow comparing a single character from a string to a multi-character string.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
