'use strict';

const MESSAGE_ID_ERROR = 'prefer-map-has/error';
const MESSAGE_ID_SUGGESTION = 'prefer-map-has/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

/**
@param {import('eslint').Rule.RuleContext} context
@param {import('estree').SimpleCallExpression} node
@param {import('estree').Node} [replacement]
*/
function processNode(context, node, replacement = node) {
	if (node.callee.type !== 'MemberExpression') {
		return;
	}

	if (node.callee.object.type !== 'Identifier') {
		return;
	}

	if (node.callee.property.name !== 'get') {
		return;
	}

	if (node.arguments.length !== 1) {
		return;
	}

	const objectName = context.sourceCode.getText(node.callee.object);

	const newCode = `${objectName}.has(${context.sourceCode.getText(node.arguments[0])})`;

	context.report({
		node: replacement,
		messageId: MESSAGE_ID_ERROR,
		data: {
			value: 'Map#get',
			replacement: 'Map#has',
		},
		/** @param {import('eslint').Rule.RuleFixer} fixer */
		suggest: [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {
					value: context.sourceCode.getText(replacement),
					replacement: newCode,
				},
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(replacement, newCode),
			},
		],
	});
}

/**
@param {import('eslint').Rule.RuleContext} context
@param {import('estree').Node} [node]
@returns {void}
*/
function processTest(context, node) {
	if (!node) {
		return;
	}

	switch (node.type) {
		case 'CallExpression': {
			processNode(context, node);

			break;
		}

		case 'UnaryExpression': {
			processTest(context, node.argument);

			break;
		}

		case 'LogicalExpression': {
			if (node.left.type === 'LogicalExpression') {
				processTest(context, node.left);
			} else if (node.left.type === 'CallExpression') {
				processNode(context, node.left);
			}

			if (node.right.type === 'LogicalExpression') {
				processTest(context, node.right);
			} else if (node.right.type === 'CallExpression') {
				processNode(context, node.right);
			}

			break;
		}
	// No default
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').IfStatement} node */
	IfStatement(node) {
		processTest(context, node.test);
	},
	/** @param {import('estree').ConditionalExpression} node */
	'ConditionalExpression[test.type="CallExpression"]'(node) {
		processNode(context, node.test);
	},
	/** @param {import('estree').CallExpression} node */
	'CallExpression[callee.type="Identifier"][callee.name="Boolean"]'(node) {
		for (const argument of node.arguments) {
			if (argument.type === 'CallExpression') {
				processNode(context, argument, node);
			}
		}
	},
	/** @param {import('estree').NewExpression} node */
	'NewExpression[callee.type="Identifier"][callee.name="Boolean"]'(node) {
		for (const argument of node.arguments) {
			if (argument.type === 'CallExpression') {
				processNode(context, argument, node);
			}
		}
	},
	/** @param {import('estree').WhileStatement} node */
	WhileStatement(node) {
		processTest(context, node.test);
	},
	/** @param {import('estree').DoWhileStatement} node */
	DoWhileStatement(node) {
		processTest(context, node.test);
	},
	/** @param {import('estree').ForStatement} node */
	ForStatement(node) {
		processTest(context, node.test);
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Map#has` over `Map#get`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};
