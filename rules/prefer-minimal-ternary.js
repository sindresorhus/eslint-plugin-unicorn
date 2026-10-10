import {
	checkVueTemplate,
	getAncestor,
	getTokenStore,
	isParenthesized,
	needsSemicolon,
} from './utils/index.js';
import {
	isMinimalTernary,
	isTypeSafeToMinimize,
	getMinimalExpressionText,
	minimalTernaryOptionsSchema,
	minimalTernaryDefaultOptions,
} from './shared/minimal-ternary.js';

const MESSAGE_ID = 'prefer-minimal-ternary';
const messages = {
	[MESSAGE_ID]: 'Move the ternary into the varying part of the expression.',
};

function fixMinimalTernary(node, context, fixer, abort) {
	const {sourceCode} = context;
	const tokenStore = getTokenStore(context, node);
	if (
		// Vue.js attributes require quote escaping and may contain statements, so only report there.
		getAncestor(node, 'VAttribute')
		// Template fixes support expressions, not statement bodies that require ASI handling.
		|| (tokenStore !== sourceCode && getAncestor(node, 'BlockStatement'))
		|| tokenStore.getCommentsInside(node).length > 0
		// A conditional produces a value, while member access produces a reference.
		|| (node.consequent.type === 'MemberExpression' && (
			node.parent.type.startsWith('TS')
			|| (node.parent.type === 'CallExpression' && node.parent.callee === node)
			|| (node.parent.type === 'TaggedTemplateExpression' && node.parent.tag === node)
			|| (node.parent.type === 'UnaryExpression' && node.parent.operator === 'delete')
		))
	) {
		abort();
	}

	let text = getMinimalExpressionText(node.consequent, node.alternate, {condition: node.test, context});
	// A statement starting with `let[…]` is parsed as a declaration in scripts.
	if (text === undefined || /^let\s*\[/u.test(text)) {
		abort();
	}

	if (
		node.consequent.type === 'ObjectExpression'
		|| node.consequent.operator === 'in'
	) {
		text = `(${text})`;
	}

	if (tokenStore === sourceCode && !isParenthesized(node, context) && needsSemicolon(tokenStore.getTokenBefore(node), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(node, text);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = context.options[0];

	context.on('ConditionalExpression', node => {
		if (!isMinimalTernary(node.consequent, node.alternate, context, options)) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};
		const fix = function * (fixer, {abort}) {
			yield fixMinimalTernary(node, context, fixer, abort);
		};

		if (isTypeSafeToMinimize(node.consequent, node.alternate, context)) {
			problem.fix = fix;
		} else if (node.consequent.type === 'ObjectExpression') {
			problem.suggest = [{messageId: MESSAGE_ID, fix}];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer moving ternaries into the minimal varying part of an expression.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [minimalTernaryOptionsSchema],
		defaultOptions: [minimalTernaryDefaultOptions],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
