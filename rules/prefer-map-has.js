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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').IfStatement} node */
	IfStatement(node) {
		if (node.test.type === 'CallExpression') {
			processNode(context, node.test);
		} else if (node.test.type === 'LogicalExpression') {
			if (node.test.left.type === 'CallExpression') {
				processNode(context, node.test.left);
			} else if (node.test.right.type === 'CallExpression') {
				processNode(context, node.test.right);
			}
		}
	},
	/** @param {import('estree').ConditionalExpression} node */
	ConditionalExpression(node) {
		if (node.test.type === 'CallExpression') {
			processNode(context, node.test);
		}
	},
	/** @param {import('estree').CallExpression} node */
	CallExpression(node) {
		if (node.callee.type === 'Identifier' && node.callee.name === 'Boolean') {
			for (const argument of node.arguments) {
				if (argument.type === 'CallExpression') {
					processNode(context, argument, node);
				}
			}
		}
	},
	/** @param {import('estree').NewExpression} node */
	NewExpression(node) {
		if (node.callee.type === 'Identifier' && node.callee.name === 'Boolean') {
			for (const argument of node.arguments) {
				if (argument.type === 'CallExpression') {
					processNode(context, argument, node);
				}
			}
		}
	},
	/** @param {import('estree').UnaryExpression} node */
	UnaryExpression(node) {
		if (node.operator === '!') {
			if (node.argument.type === 'UnaryExpression' && node.argument.operator === node.operator && node.argument.argument.type === 'CallExpression') {
				processNode(context, node.argument.argument, node);
			} else if (node.parent && node.parent.type !== 'UnaryExpression' && node.argument.type === 'CallExpression') {
				processNode(context, node.argument);
			}
		}
	},
	/** @param {import('estree').WhileStatement} node */
	WhileStatement(node) {
		if (node.test.type === 'CallExpression') {
			processNode(context, node.test);
		} else if (node.test.type === 'LogicalExpression') {
			if (node.test.left.type === 'CallExpression') {
				processNode(context, node.test.left);
			} else if (node.test.right.type === 'CallExpression') {
				processNode(context, node.test.right);
			}
		}
	},
	/** @param {import('estree').DoWhileStatement} node */
	DoWhileStatement(node) {
		if (node.test.type === 'CallExpression') {
			processNode(context, node.test);
		} else if (node.test.type === 'LogicalExpression') {
			if (node.test.left.type === 'CallExpression') {
				processNode(context, node.test.left);
			} else if (node.test.right.type === 'CallExpression') {
				processNode(context, node.test.right);
			}
		}
	},
	/** @param {import('estree').ForStatement} node */
	ForStatement(node) {
		if (node.test && node.test.type === 'CallExpression') {
			processNode(context, node.test);
		} else if (node.test && node.test.type === 'LogicalExpression') {
			if (node.test.left.type === 'CallExpression') {
				processNode(context, node.test.left);
			} else if (node.test.right.type === 'CallExpression') {
				processNode(context, node.test.right);
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Prefer `Map#has` over `Map#get`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};
