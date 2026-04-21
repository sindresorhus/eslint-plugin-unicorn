const MESSAGE_ID = 'no-top-level-side-effects';

const messages = {
	[MESSAGE_ID]: 'Do not run side-effectful statements at the top level.',
};

const safeTopLevelStatementTypes = new Set([
	'ImportDeclaration',
	'ExportAllDeclaration',
	'ExportNamedDeclaration',
	'ExportDefaultDeclaration',
	'VariableDeclaration',
	'FunctionDeclaration',
	'ClassDeclaration',
	'TSEnumDeclaration',
	'TSInterfaceDeclaration',
	'TSModuleDeclaration',
	'TSTypeAliasDeclaration',
	'EmptyStatement',
]);

const isDirective = statement =>
	statement.type === 'ExpressionStatement'
	&& statement.expression.type === 'Literal'
	&& typeof statement.expression.value === 'string';

const isTopLevelSideEffectStatement = statement => {
	if (safeTopLevelStatementTypes.has(statement.type)) {
		return false;
	}

	if (isDirective(statement)) {
		return false;
	}

	return true;
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create(context) {
		context.on('Program', node => {
			for (const statement of node.body) {
				if (!isTopLevelSideEffectStatement(statement)) {
					continue;
				}

				context.report({
					node: statement,
					messageId: MESSAGE_ID,
				});
			}
		});
	},
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prevent side-effectful top-level statements.',
			recommended: false,
		},
		messages,
	},
};

export default config;
