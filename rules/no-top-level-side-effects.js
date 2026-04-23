const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Unexpected side effect at module top level.',
};

const SIDE_EFFECT_TYPES = new Set([
	'CallExpression',
	'NewExpression',
	'TaggedTemplateExpression',
]);

const hasExport = node =>
	node.type === 'ExportNamedDeclaration'
	|| node.type === 'ExportDefaultDeclaration'
	|| node.type === 'ExportAllDeclaration';

const isCallLike = expression =>
	SIDE_EFFECT_TYPES.has(expression.type)
	|| (
		expression.type === 'ChainExpression'
		&& expression.expression.type === 'CallExpression'
	);

const isSideEffect = expression =>
	isCallLike(expression)
	|| (
		expression.type === 'AwaitExpression'
		&& expression.argument !== null
		&& isCallLike(expression.argument)
	);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', program => {
		const {sourceCode} = context;

		if (sourceCode.text.startsWith('#!')) {
			return;
		}

		if (!program.body.some(node => hasExport(node))) {
			return;
		}

		for (const node of program.body) {
			if (node.type === 'ExpressionStatement' && isSideEffect(node.expression)) {
				context.report({
					node: node.expression,
					messageId: MESSAGE_ID,
				});
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow side effects at module top level.',
			recommended: 'unopinionated',
		},
		messages,
	},
};

export default config;
