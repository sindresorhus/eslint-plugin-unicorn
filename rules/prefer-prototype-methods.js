'use strict';
const {getPropertyName} = require('@eslint-community/eslint-utils');
const {fixSpaceAroundKeyword} = require('./fix/index.js');
const {isMemberExpression, isMethodCall} = require('./ast/index.js');

const messages = {
	'known-method': 'Prefer using `{{constructorName}}.prototype.{{methodName}}`.',
	'unknown-method': 'Prefer using method from `{{constructorName}}.prototype`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	return {
		CallExpression(callExpression) {
			let methodNode;

			if (
				// `Reflect.apply([].foo, …)`
				// `Reflect.apply({}.foo, …)`
				isMethodCall(callExpression, {
					object: 'Reflect',
					method: 'apply',
					minimumArguments: 1,
					optionalCall: false,
					optionalMember: false,
				})
			) {
				methodNode = callExpression.arguments[0];
			} else if (
				// `[].foo.{apply,bind,call}(…)`
				// `({}).foo.{apply,bind,call}(…)`
				isMethodCall(callExpression, {
					names: ['apply', 'bind', 'call'],
					optionalCall: false,
					optionalMember: false,
				})
			) {
				methodNode = callExpression.callee.object;
			}

			if (!methodNode || !isMemberExpression(methodNode, {optional: false})) {
				return;
			}

			const objectNode = methodNode.object;

			if (!(
				(objectNode.type === 'ArrayExpression' && objectNode.elements.length === 0)
				|| (objectNode.type === 'ObjectExpression' && objectNode.properties.length === 0)
			)) {
				return;
			}

			const constructorName = objectNode.type === 'ArrayExpression' ? 'Array' : 'Object';
			const {sourceCode} = context;
			const methodName = getPropertyName(methodNode, sourceCode.getScope(methodNode));

			return {
				node: methodNode,
				messageId: methodName ? 'known-method' : 'unknown-method',
				data: {constructorName, methodName},
				* fix(fixer) {
					yield fixer.replaceText(objectNode, `${constructorName}.prototype`);

					if (
						objectNode.type === 'ArrayExpression'
						|| objectNode.type === 'ObjectExpression'
					) {
						yield * fixSpaceAroundKeyword(fixer, callExpression, sourceCode);
					}
				},
			};
		},
	};
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer borrowing methods from the prototype instead of the instance.',
		},
		fixable: 'code',
		messages,
	},
};
