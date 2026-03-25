const MESSAGE_ID = 'no-top-level-side-effects';
const messages = {
	[MESSAGE_ID]: 'Do not use side effects at the top level of a module.',
};

const hasHashbang = sourceCode => sourceCode.getText().startsWith('#!');

const hasExports = ({ast}) =>
	ast.body.some(node =>
		node.type === 'ExportDefaultDeclaration'
		|| node.type === 'ExportNamedDeclaration'
		|| node.type === 'ExportAllDeclaration',
	);

const allowedTopLevelStatementTypes = new Set([
	'ImportDeclaration',
	'ExportDefaultDeclaration',
	'ExportNamedDeclaration',
	'ExportAllDeclaration',
	'VariableDeclaration',
	'FunctionDeclaration',
	'ClassDeclaration',
	'EmptyStatement',
	// TypeScript
	'TSTypeAliasDeclaration',
	'TSInterfaceDeclaration',
	'TSEnumDeclaration',
	'TSModuleDeclaration',
	'TSDeclareFunction',
	'TSImportEqualsDeclaration',
]);

const isDirective = node =>
	node.type === 'ExpressionStatement'
	&& typeof node.directive === 'string';

function getCalleeName(node) {
	if (node.type === 'Identifier') {
		return node.name;
	}

	if (
		node.type === 'MemberExpression'
		&& !node.computed
		&& !node.optional
		&& node.property.type === 'Identifier'
	) {
		const objectName = getCalleeName(node.object);
		if (objectName !== undefined) {
			return `${objectName}.${node.property.name}`;
		}
	}
}

function isAllowedCall(expression, allowedCalls) {
	if (expression.type !== 'CallExpression') {
		return false;
	}

	const calleeText = getCalleeName(expression.callee);
	return calleeText !== undefined && allowedCalls.includes(calleeText);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	if (hasHashbang(sourceCode)) {
		return;
	}

	const [{allowedCalls}] = context.options;

	context.on('Program:exit', function * (programNode) {
		if (!hasExports(sourceCode)) {
			return;
		}

		for (const node of programNode.body) {
			if (allowedTopLevelStatementTypes.has(node.type)) {
				continue;
			}

			if (isDirective(node)) {
				continue;
			}

			if (
				node.type === 'ExpressionStatement'
				&& allowedCalls.length > 0
				&& isAllowedCall(node.expression, allowedCalls)
			) {
				continue;
			}

			yield {
				node,
				messageId: MESSAGE_ID,
			};
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowedCalls: {
				type: 'array',
				items: {
					type: 'string',
				},
				uniqueItems: true,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow side effects at the top level of a module.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{allowedCalls: []}],
		messages,
	},
};

export default config;
