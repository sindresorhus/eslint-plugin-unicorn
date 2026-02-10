const MESSAGE_ID = 'no-top-level-side-effects';

const messages = {
	[MESSAGE_ID]: 'Do not use top-level side effects.',
};

const isSideEffectFreeObjectProperty = property => {
	if (property.type === 'SpreadElement') {
		return isSideEffectFreeExpression(property.argument);
	}

	if (property.computed && !isSideEffectFreeExpression(property.key)) {
		return false;
	}

	return property.type !== 'Property' || isSideEffectFreeExpression(property.value);
};

const isSideEffectFreeExpression = node => {
	const handler = sideEffectFreeHandlers[node.type];
	return handler ? handler(node) : false;
};

const sideEffectFreeHandlers = {
	Literal() {
		return true;
	},
	Identifier() {
		return true;
	},
	ThisExpression() {
		return true;
	},
	Super() {
		return true;
	},
	FunctionExpression() {
		return true;
	},
	ArrowFunctionExpression() {
		return true;
	},
	ClassExpression() {
		return true;
	},
	MetaProperty() {
		return true;
	},
	ChainExpression(node) {
		return isSideEffectFreeExpression(node.expression);
	},
	TemplateLiteral(node) {
		return node.expressions.every(expression => isSideEffectFreeExpression(expression));
	},
	UnaryExpression(node) {
		return node.operator !== 'delete' && isSideEffectFreeExpression(node.argument);
	},
	BinaryExpression(node) {
		return isSideEffectFreeExpression(node.left) && isSideEffectFreeExpression(node.right);
	},
	LogicalExpression(node) {
		return isSideEffectFreeExpression(node.left) && isSideEffectFreeExpression(node.right);
	},
	ConditionalExpression(node) {
		return isSideEffectFreeExpression(node.test)
			&& isSideEffectFreeExpression(node.consequent)
			&& isSideEffectFreeExpression(node.alternate);
	},
	SequenceExpression(node) {
		return node.expressions.every(expression => isSideEffectFreeExpression(expression));
	},
	MemberExpression(node) {
		return isSideEffectFreeExpression(node.object)
			&& (!node.computed || isSideEffectFreeExpression(node.property));
	},
	ArrayExpression(node) {
		return node.elements.every(element => !element || isSideEffectFreeExpression(element));
	},
	ObjectExpression(node) {
		return node.properties.every(property => isSideEffectFreeObjectProperty(property));
	},
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
		case 'ClassDeclaration': {
			return true;
		}

		case 'ExpressionStatement': {
			return Boolean(statement.directive) || isSideEffectFreeExpression(statement.expression);
		}

		case 'ExportNamedDeclaration': {
			return !statement.declaration || isDeclarationNode(statement.declaration);
		}

		case 'ExportDefaultDeclaration': {
			return isAllowedExportDefault(statement.declaration);
		}

		default: {
			return false;
		}
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
