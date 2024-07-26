'use strict';

const MESSAGE_ID_ERROR = 'prefer-global-this/error';
const MESSAGE_ID_SUGGESTION = 'prefer-global-this/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
 * Find the variable in the scope
 * @param {import('eslint').Scope.Scope} scope
 * @param {string} variableName
 * @returns
 */
function findVariableInScope(scope, variableName) {
	if (!scope || scope.type === 'global') {
		return;
	}

	const variable = scope.variables.find(v => v.name === variableName);

	if (variable) {
		return variable;
	}

	return findVariableInScope(scope.upper, variableName);
}

const globalIdentifier = new Set(['window', 'self', 'global']);

/**
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node} node
 * @param {string} value
 */
function report(context, node, value) {
	context.report({
		node,
		messageId: MESSAGE_ID_ERROR,
		data: {
			value,
			replacement: 'globalThis',
		},
		fix: fixer => fixer.replaceText(node, 'globalThis'),
		suggest: [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {
					value,
					replacement: 'globalThis',
				},
				fix: fixer => fixer.replaceText(node, 'globalThis'),
			},
		],
	});
}

/**
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @param {import('estree').Node | Array<import('estree').Node>} nodes
 * @returns
 */
function handleNodes(context, nodes) {
	if (!Array.isArray(nodes)) {
		nodes = [nodes];
	}

	for (const node of nodes) {
		if (node && node.type === 'Identifier' && globalIdentifier.has(node.name)) {
			const variable = findVariableInScope(
				context.sourceCode.getScope(node),
				node.name,
			);

			if (variable) {
				return;
			}

			return report(context, node, node.name);
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').MemberExpression} node */
	MemberExpression(node) {
		handleNodes(context, [node.object]);
	},
	/** @param {import('estree').CallExpression} node */
	CallExpression(node) {
		handleNodes(context, [node.object]);
	},
	/** @param {import('estree').BinaryExpression} node */
	BinaryExpression(node) {
		handleNodes(context, [node.left, node.right]);
	},
	/** @param {import('estree').LogicalExpression} node */
	LogicalExpression(node) {
		handleNodes(context, [node.left, node.right]);
	},
	/** @param {import('estree').ArrayExpression} node */
	ArrayExpression(node) {
		handleNodes(context, node.elements);
	},
	/** @param {import('estree').AssignmentExpression} node */
	AssignmentExpression(node) {
		handleNodes(context, [node.left, node.right]);
	},
	/** @param {import('estree').YieldExpression} node */
	YieldExpression(node) {
		handleNodes(context, node.argument);
	},
	/** @param {import('estree').AwaitExpression} node */
	AwaitExpression(node) {
		handleNodes(context, node.argument);
	},
	/** @param {import('estree').ConditionalExpression} node */
	ConditionalExpression(node) {
		handleNodes(context, [node.test, node.consequent, node.alternate]);
	},
	/** @param {import('estree').ExpressionStatement} node */
	ExpressionStatement(node) {
		switch (node.expression.type) {
			case 'Identifier': {
				handleNodes(context, node.expression);
				break;
			}

			default: {
				break;
			}
		}
	},
	/** @param {import('estree').ImportExpression} node */
	ImportExpression(node) {
		handleNodes(context, node.source);
	},
	/** @param {import('estree').ReturnStatement} node */
	ReturnStatement(node) {
		handleNodes(context, node.argument);
	},
	/** @param {import('estree').NewExpression} node */
	NewExpression(node) {
		handleNodes(context, node.callee);
	},
	/** @param {import('estree').ObjectExpression} node */
	ObjectExpression(node) {
		for (const property of node.properties) {
			handleNodes(context, property.value);
		}
	},
	/** @param {import('estree').SequenceExpression} node */
	SequenceExpression(node) {
		handleNodes(context, node.expressions);
	},
	/** @param {import('estree').TaggedTemplateExpression} node */
	TaggedTemplateExpression(node) {
		handleNodes(context, node.tag);
		handleNodes(context, node.quasi.expressions);
	},
	/** @param {import('estree').TemplateLiteral} node */
	TemplateLiteral(node) {
		handleNodes(context, node.expressions);
	},
	/** @param {import('estree').UnaryExpression} node */
	UnaryExpression(node) {
		handleNodes(context, node.argument);
	},
	/** @param {import('estree').UnaryExpression} node */
	UpdateExpression(node) {
		handleNodes(context, node.argument);
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `globalThis` instead of `window` and `global`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};
