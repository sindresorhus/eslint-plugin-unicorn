const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects in exported modules.',
};

const sideEffectStatementTypes = new Set([
	'DebuggerStatement',
	'DoWhileStatement',
	'ForInStatement',
	'ForOfStatement',
	'ForStatement',
	'IfStatement',
	'LabeledStatement',
	'SwitchStatement',
	'ThrowStatement',
	'TryStatement',
	'WhileStatement',
	'WithStatement',
]);

const allowedExpressionStatementTypes = new Set([
	'AssignmentExpression',
	'Literal',
	'UpdateExpression',
]);

const isExportDeclaration = node =>
	node.type === 'ExportAllDeclaration'
	|| node.type === 'ExportDefaultDeclaration'
	|| node.type === 'ExportNamedDeclaration';

const isSideEffectOnlyImport = node =>
	node.type === 'ImportDeclaration'
	&& node.specifiers.length === 0;

const isSideEffectExpressionStatement = node =>
	node.type === 'ExpressionStatement'
	&& !allowedExpressionStatementTypes.has(node.expression.type);

const isSideEffectBlockStatement = node =>
	node.type === 'BlockStatement'
	&& node.body.some(node => isSideEffectStatement(node));

const isSideEffectStatement = node =>
	sideEffectStatementTypes.has(node.type)
	|| isSideEffectOnlyImport(node)
	|| isSideEffectExpressionStatement(node)
	|| isSideEffectBlockStatement(node);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const startsWithHashBang = context.sourceCode.lines[0]?.indexOf('#!') === 0;

	if (startsWithHashBang) {
		return;
	}

	context.on('Program', function * (program) {
		const hasExports = program.body.some(node => isExportDeclaration(node));

		if (!hasExports) {
			return;
		}

		for (const node of program.body) {
			if (isSideEffectStatement(node)) {
				yield {
					node,
					messageId: MESSAGE_ID,
				};
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
			description: 'Disallow top-level side effects in exported modules.',
			recommended: 'unopinionated',
		},
		messages,
	},
};

export default config;
