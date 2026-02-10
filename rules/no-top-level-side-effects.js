const MESSAGE_ID = 'no-top-level-side-effects';

const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects.',
};

const isSideEffectFreeExpression = node => {
	switch (node.type) {
		case 'Literal':
		case 'Identifier':
		case 'ThisExpression':
		case 'Super':
		case 'FunctionExpression':
		case 'ArrowFunctionExpression':
		case 'ClassExpression':
		case 'MetaProperty':
			return true;
		case 'ChainExpression':
			return isSideEffectFreeExpression(node.expression);
		case 'TemplateLiteral':
			return node.expressions.every(isSideEffectFreeExpression);
		case 'UnaryExpression':
			return node.operator !== 'delete' && isSideEffectFreeExpression(node.argument);
		case 'BinaryExpression':
		case 'LogicalExpression':
			return isSideEffectFreeExpression(node.left) && isSideEffectFreeExpression(node.right);
		case 'ConditionalExpression':
			return isSideEffectFreeExpression(node.test)
				&& isSideEffectFreeExpression(node.consequent)
				&& isSideEffectFreeExpression(node.alternate);
		case 'SequenceExpression':
			return node.expressions.every(isSideEffectFreeExpression);
		case 'MemberExpression':
			return isSideEffectFreeExpression(node.object)
				&& (!node.computed || isSideEffectFreeExpression(node.property));
		case 'ArrayExpression':
			return node.elements.every(element => !element || isSideEffectFreeExpression(element));
		case 'ObjectExpression':
			return node.properties.every(property => {
				if (property.type === 'SpreadElement') {
					return isSideEffectFreeExpression(property.argument);
				}

				if (property.computed && !isSideEffectFreeExpression(property.key)) {
					return false;
				}

				return property.type !== 'Property' || isSideEffectFreeExpression(property.value);
			});
		default:
			return false;
	}
};

const isDeclarationNode = node => node?.type?.endsWith?.('Declaration');

const isAllowedExportDefault = declaration => {
	if (!declaration) {
		return true;
	}

	if (isDeclarationNode(declaration)) {
		return true;
	}

	return isSideEffectFreeExpression(declaration);
};

const isAllowedTopLevelStatement = statement => {
	switch (statement.type) {
		case 'EmptyStatement':
		case 'ImportDeclaration':
		case 'ExportAllDeclaration':
		case 'VariableDeclaration':
		case 'FunctionDeclaration':
		case 'ClassDeclaration':
			return true;
		case 'ExpressionStatement':
			return Boolean(statement.directive) || isSideEffectFreeExpression(statement.expression);
		case 'ExportNamedDeclaration':
			return !statement.declaration || isDeclarationNode(statement.declaration);
		case 'ExportDefaultDeclaration':
			return isAllowedExportDefault(statement.declaration);
		default:
			return false;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Program', program => {
		for (const statement of program.body) {
			if (isAllowedTopLevelStatement(statement)) {
				continue;
			}

			context.report({
				node: statement,
				messageId: MESSAGE_ID,
			});
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow top-level side effects.',
			recommended: false,
		},
		messages,
	},
};

export default config;
