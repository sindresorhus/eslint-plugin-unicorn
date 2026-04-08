const MESSAGE_ID = 'no-top-level-side-effects';

const messages = {
	[MESSAGE_ID]: 'Unexpected top-level side effect.',
};

const PURE_ANNOTATION_REGEX = /@__PURE__|#__PURE__|@__NO_SIDE_EFFECTS__|#__NO_SIDE_EFFECTS__/u;

function hasPureAnnotation(node, sourceCode) {
	return sourceCode
		.getCommentsBefore(node)
		.some(comment => PURE_ANNOTATION_REGEX.test(comment.value));
}

function isModuleExportsExpression(node) {
	if (node.type !== 'MemberExpression' || node.computed) {
		return false;
	}

	if (
		node.object.type === 'Identifier'
		&& node.object.name === 'module'
		&& node.property.type === 'Identifier'
		&& node.property.name === 'exports'
	) {
		return true;
	}

	if (node.object.type === 'MemberExpression') {
		return isModuleExportsExpression(node.object);
	}

	return false;
}

function collectBindingNames(pattern) {
	const names = new Set();

	const visit = node => {
		if (!node) {
			return;
		}

		switch (node.type) {
			case 'Identifier': {
				names.add(node.name);
				break;
			}

			case 'ObjectPattern': {
				for (const property of node.properties) {
					visit(property.type === 'RestElement' ? property.argument : property.value);
				}

				break;
			}

			case 'ArrayPattern': {
				for (const element of node.elements) {
					if (element) {
						visit(element);
					}
				}

				break;
			}

			case 'AssignmentPattern': {
				visit(node.left);
				break;
			}

			case 'RestElement': {
				visit(node.argument);
				break;
			}

			default: {
				break;
			}
		}
	};

	visit(pattern);
	return names;
}

function isPureExpression(node) {
	switch (node.type) {
		case 'Literal':
		case 'Identifier':
		case 'FunctionExpression':
		case 'ArrowFunctionExpression':
		case 'ClassExpression': {
			return true;
		}

		case 'UnaryExpression': {
			// `delete x` is always a side effect; other unary operators are pure if their argument is
			return node.operator !== 'delete' && isPureExpression(node.argument);
		}

		case 'BinaryExpression': {
			return isPureExpression(node.left) && isPureExpression(node.right);
		}

		case 'LogicalExpression': {
			return isPureExpression(node.left) && isPureExpression(node.right);
		}

		case 'ConditionalExpression': {
			return (
				isPureExpression(node.test)
				&& isPureExpression(node.consequent)
				&& isPureExpression(node.alternate)
			);
		}

		case 'TemplateLiteral': {
			return node.expressions.every(expression => isPureExpression(expression));
		}

		case 'MemberExpression': {
			const propertyIsPure = !node.computed || isPureExpression(node.property);
			return propertyIsPure && isPureExpression(node.object);
		}

		case 'ObjectExpression': {
			return node.properties.every(property => {
				if (property.type === 'SpreadElement') {
					return isPureExpression(property.argument);
				}

				const keyIsPure = !property.computed || isPureExpression(property.key);
				return keyIsPure && isPureExpression(property.value);
			});
		}

		case 'ArrayExpression': {
			return node.elements.every(element => {
				if (element === null) {
					return true;
				}

				if (element.type === 'SpreadElement') {
					return isPureExpression(element.argument);
				}

				return isPureExpression(element);
			});
		}

		case 'SequenceExpression': {
			return node.expressions.every(expression => isPureExpression(expression));
		}

		default: {
			return false;
		}
	}
}

const create = context => {
	const {sourceCode} = context;

	const localNames = new Set();
	const importedNames = new Set();
	const pureAnnotatedFunctions = new Set();

	let hasExports = false;
	let hasHashbang = false;

	return {
		Program(node) {
			const text = sourceCode.getText(node);
			hasHashbang = text.startsWith('#!');
		},

		ImportDeclaration(node) {
			for (const specifier of node.specifiers) {
				importedNames.add(specifier.local.name);
			}
		},

		ExportNamedDeclaration() {
			hasExports = true;
		},

		ExportDefaultDeclaration() {
			hasExports = true;
		},

		ExportAllDeclaration() {
			hasExports = true;
		},

		'Program > VariableDeclaration'(node) {
			for (const declarator of node.declarations) {
				for (const name of collectBindingNames(declarator.id)) {
					localNames.add(name);
				}
			}
		},

		'Program > FunctionDeclaration'(node) {
			if (node.id) {
				localNames.add(node.id.name);
				if (
					sourceCode
						.getCommentsBefore(node)
						.some(comment => PURE_ANNOTATION_REGEX.test(comment.value))
				) {
					pureAnnotatedFunctions.add(node.id.name);
				}
			}
		},

		'Program > ClassDeclaration'(node) {
			if (node.id) {
				localNames.add(node.id.name);
			}
		},

		'Program > ExpressionStatement > AssignmentExpression'(node) {
			const {left} = node;
			if (
				(left.type === 'MemberExpression' && isModuleExportsExpression(left))
				|| (
					left.type === 'MemberExpression'
					&& !left.computed
					&& left.object.type === 'Identifier'
					&& left.object.name === 'exports'
				)
			) {
				hasExports = true;
			}
		},

		'Program:exit'(programNode) {
			if (hasHashbang || !hasExports) {
				return;
			}

			for (const statement of programNode.body) {
				if (statement.type === 'ExpressionStatement') {
					const {expression} = statement;

					// Allow directives like 'use strict'
					if (expression.type === 'Literal' && typeof expression.value === 'string') {
						continue;
					}

					if (expression.type === 'AssignmentExpression') {
						const {left} = expression;

						// CJS: module.exports = ...
						if (left.type === 'MemberExpression' && isModuleExportsExpression(left)) {
							continue;
						}

						// CJS: exports.foo = ...
						if (
							left.type === 'MemberExpression'
							&& !left.computed
							&& left.object.type === 'Identifier'
							&& left.object.name === 'exports'
						) {
							continue;
						}

						// local var reassignment is fine
						if (
							left.type === 'Identifier'
							&& localNames.has(left.name)
							&& !importedNames.has(left.name)
						) {
							continue;
						}

						// mutation of locally declared object is fine (localObj.foo = ...)
						if (
							left.type === 'MemberExpression'
							&& left.object.type === 'Identifier'
							&& localNames.has(left.object.name)
							&& !importedNames.has(left.object.name)
						) {
							continue;
						}

						context.report({node: statement, messageId: MESSAGE_ID});
						continue;
					}

						if (hasPureAnnotation(expression, sourceCode)) {
						continue;
					}

					if (
						expression.type === 'CallExpression'
						&& expression.callee.type === 'Identifier'
						&& pureAnnotatedFunctions.has(expression.callee.name)
					) {
						continue;
					}

					context.report({node: statement, messageId: MESSAGE_ID});
					continue;
				}

				if (
					statement.type === 'IfStatement'
					|| statement.type === 'ForStatement'
					|| statement.type === 'ForInStatement'
					|| statement.type === 'ForOfStatement'
					|| statement.type === 'WhileStatement'
					|| statement.type === 'DoWhileStatement'
					|| statement.type === 'TryStatement'
					|| statement.type === 'ThrowStatement'
					|| statement.type === 'SwitchStatement'
					|| statement.type === 'WithStatement'
					|| statement.type === 'LabeledStatement'
				) {
					context.report({node: statement, messageId: MESSAGE_ID});
					continue;
				}

				if (statement.type === 'ExportDefaultDeclaration') {
					const {declaration} = statement;

					if (
						declaration.type === 'FunctionDeclaration'
						|| declaration.type === 'ClassDeclaration'
					) {
						continue;
					}

					if (!isPureExpression(declaration) && !hasPureAnnotation(declaration, sourceCode)) {
						context.report({node: statement, messageId: MESSAGE_ID});
					}
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow top-level side effects.',
			recommended: false,
		},
		messages,
	},
};

export default config;
