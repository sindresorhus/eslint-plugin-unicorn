import {getClosestFunctionScope} from './utils/index.js';

const MESSAGE_ID = 'no-this-outside-of-class';
const messages = {
	[MESSAGE_ID]: 'Disallow `this` outside of class scope.',
};

/** @type {import('eslint').Rule.RuleModule['create']} */
const create = context => {
	const {sourceCode} = context;

	const allowedScopes = new Set(['global', 'module', 'class', 'class-field-initializer']);

	return {
		ThisExpression(node) {
			const functionScope = getClosestFunctionScope(sourceCode.getScope(node));

			if (!functionScope) {
				return;
			}

			if (allowedScopes.has(functionScope.type)) {
				return;
			}

			if (functionScope.type === 'function') {
				/** @type {import('estree').Function & {parent: import('estree').Node} */
				const functionNode = functionScope.block;

				if (functionScope.upper?.type === 'class' && functionNode.parent.type === 'MethodDefinition') {
					// The constructor/method of a class
					return;
				}

				if (functionNode.type === 'FunctionExpression' || functionNode.type === 'FunctionDeclaration') {
					// Allow function expressions that start with a capital letter
					if (/^[A-Z]/.test(functionNode.id?.name)) {
						return;
					}

					const {parent} = functionNode;

					// Allow prototype methods
					if (parent.type === 'AssignmentExpression'
						&& parent.right === functionNode
						&& parent.left.type === 'MemberExpression'
						&& parent.left.object.type === 'MemberExpression'
						&& parent.left.object.property.type === 'Identifier'
						&& parent.left.object.property.name === 'prototype') {
						return;
					}
				}
			}

			/** @type {import('eslint').Rule.ReportDescriptor} */
			const problem = {
				node,
				messageId: MESSAGE_ID,
			};

			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `this` in non-class scope',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};

export default config;
