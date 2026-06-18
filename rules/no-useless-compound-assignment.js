import {isNumericLiteral} from './ast/index.js';
import {removeStatement} from './fix/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'no-useless-compound-assignment/error';
const MESSAGE_ID_SUGGESTION_REMOVE = 'no-useless-compound-assignment/remove';
const MESSAGE_ID_SUGGESTION_REPLACE = 'no-useless-compound-assignment/replace';
const messages = {
	[MESSAGE_ID_ERROR]: 'This compound assignment is useless as `{{operator}} {{value}}` does not change the value.',
	[MESSAGE_ID_SUGGESTION_REMOVE]: 'Remove the useless assignment.',
	[MESSAGE_ID_SUGGESTION_REPLACE]: 'Replace the useless assignment with `{{left}}`.',
};

// Arithmetic compound assignment operators paired with the right-hand value that makes the operation a no-op.
// Bitwise operators (`|= 0`, `>>>= 0`, `&= -1`, …) are intentionally excluded because they are deliberate
// int32/uint32 coercion idioms, and `%= 1` is excluded because `x % 1` is the fractional part, not `x`.
const noOpAssignments = new Map([
	['+=', 0],
	['-=', 0],
	['*=', 1],
	['/=', 1],
	['**=', 1],
]);

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('AssignmentExpression', node => {
		if (!noOpAssignments.has(node.operator)) {
			return;
		}

		// Only a plain numeric literal `0`/`1` counts. This excludes BigInt (`0n`), `-0`/`+0`
		// (a `UnaryExpression`, intentionally skipped since those are not always no-ops), and
		// non-literal values whose runtime value we can't be sure of.
		if (!isNumericLiteral(node.right) || node.right.value !== noOpAssignments.get(node.operator)) {
			return;
		}

		const data = {
			operator: node.operator,
			value: node.right.raw,
		};

		// A comment inside the assignment can't be preserved when removing or replacing it,
		// so report without a suggestion in that case.
		if (sourceCode.getCommentsInside(node).length > 0) {
			return {node, messageId: MESSAGE_ID_ERROR, data};
		}

		const {parent} = node;
		const isRemovableStatement
			= parent.type === 'ExpressionStatement'
				&& ['Program', 'BlockStatement', 'StaticBlock', 'SwitchCase'].includes(parent.parent.type);

		if (isRemovableStatement) {
			return {
				node,
				messageId: MESSAGE_ID_ERROR,
				data,
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION_REMOVE,
						/** @param {ESLint.Rule.RuleFixer} fixer */
						fix: fixer => removeStatement(parent, context, fixer),
					},
				],
			};
		}

		// The value is used (e.g. `foo(x += 0)`), so reduce the assignment to its left-hand side.
		const left = sourceCode.getText(node.left);
		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION_REPLACE,
					data: {left},
					/** @param {ESLint.Rule.RuleFixer} fixer */
					fix: fixer => fixer.replaceText(node, left),
				},
			],
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless compound assignments such as `x += 0`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
