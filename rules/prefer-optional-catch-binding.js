import {isOpeningParenToken, isClosingParenToken} from '@eslint-community/eslint-utils';
import assertToken from './utils/assert-token.js';

const MESSAGE_ID_WITH_NAME = 'with-name';
const MESSAGE_ID_WITHOUT_NAME = 'without-name';
const messages = {
	[MESSAGE_ID_WITH_NAME]: 'Remove unused catch binding `{{name}}`.',
	[MESSAGE_ID_WITHOUT_NAME]: 'Remove unused catch binding.',
};

/**
Removing the whole binding pattern would also drop the expressions it evaluates while destructuring, like the call in `catch ({[getKey()]: error})`.

@param {import('estree').Pattern} node
@returns {boolean}
*/
const hasDestructuringSideEffect = node => {
	switch (node.type) {
		case 'Property': {
			return node.computed || hasDestructuringSideEffect(node.value);
		}

		case 'ObjectPattern': {
			return node.properties.some(property => hasDestructuringSideEffect(property));
		}

		case 'ArrayPattern': {
			return node.elements.some(element => element && hasDestructuringSideEffect(element));
		}

		case 'RestElement': {
			return hasDestructuringSideEffect(node.argument);
		}

		default: {
			return false;
		}
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CatchClause', catchClause => {
		const node = catchClause.param;
		if (!node) {
			return;
		}

		const {sourceCode} = context;
		const variables = sourceCode.getDeclaredVariables(node.parent);

		if (
			variables.some(variable => variable.references.length > 0)
			|| hasDestructuringSideEffect(node)
		) {
			return;
		}

		const {type, name, parent} = node;

		// Removing the whole binding pattern would drop any comment inside it (`catch ({/* x */ a})`).
		// Comments around the binding (between the parentheses) are preserved by the token-level removals below.
		const hasCommentsInsideBinding = sourceCode.getCommentsInside(node).length > 0;

		return {
			node,
			messageId: type === 'Identifier' ? MESSAGE_ID_WITH_NAME : MESSAGE_ID_WITHOUT_NAME,
			data: {name},
			fix: hasCommentsInsideBinding
				? undefined
				: function * (fixer) {
					const tokenBefore = sourceCode.getTokenBefore(node);
					assertToken(tokenBefore, {
						test: isOpeningParenToken,
						expected: '(',
						ruleId: 'prefer-optional-catch-binding',
					});

					const tokenAfter = sourceCode.getTokenAfter(node);
					assertToken(tokenAfter, {
						test: isClosingParenToken,
						expected: ')',
						ruleId: 'prefer-optional-catch-binding',
					});

					yield fixer.remove(tokenBefore);
					yield fixer.remove(node);
					yield fixer.remove(tokenAfter);

					const [, endOfClosingParenthesis] = sourceCode.getRange(tokenAfter);
					const [startOfCatchClauseBody] = sourceCode.getRange(parent.body);
					const text = sourceCode.text.slice(endOfClosingParenthesis, startOfCatchClauseBody);
					const leadingSpacesLength = text.length - text.trimStart().length;
					if (leadingSpacesLength !== 0) {
						yield fixer.removeRange([endOfClosingParenthesis, endOfClosingParenthesis + leadingSpacesLength]);
					}
				},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer omitting the `catch` binding parameter.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
