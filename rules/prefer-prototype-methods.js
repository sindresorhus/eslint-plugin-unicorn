'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url.js');
const {
	methodCallSelector,
	emptyObjectSelector,
	emptyArraySelector,
	matches
} = require('./selectors/index.js');
const getPropertyName = require('./utils/get-property-name.js');

const messages = {
	'known-method': 'Prefer using `{{constructorName}}.prototype.{{methodName}}`.',
	'unknown-method': 'Prefer using method from `{{constructorName}}.prototype`.'
};

const emptyObjectOrArrayMethodSelector = [
	'MemberExpression',
	matches([emptyObjectSelector('object'), emptyArraySelector('object')])
].join('');
const functionMethodsSelector = [
	methodCallSelector(['apply', 'bind', 'call']),
	' > ',
	'.callee',
	' > ',
	`${emptyObjectOrArrayMethodSelector}.object`
].join('');

const reflectApplySelector = [
	methodCallSelector({object: 'Reflect', name: 'apply', min: 1}),
	' > ',
	`${emptyObjectOrArrayMethodSelector}.arguments:first-child`
].join('');

const selector = matches([functionMethodsSelector, reflectApplySelector]);

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	return {
		[selector](node) {
			const constructorName = node.object.type === 'ArrayExpression' ? 'Array' : 'Object';
			const methodName = getPropertyName(node, context.getScope());

			context.report({
				node,
				messageId: methodName ? 'known-method' : 'unknown-method',
				data: {constructorName, methodName: String(methodName)},
				fix: fixer => fixer.replaceText(node.object, `${constructorName}.prototype`)
			});
		}
	};
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer borrowing methods from the prototype instead of the instance.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema: [],
		messages
	}
};
