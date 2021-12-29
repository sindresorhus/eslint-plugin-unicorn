'use strict';
const {
	methodCallSelector,
	emptyObjectSelector,
	emptyArraySelector,
	matches,
} = require('./selectors/index.js');
const getKeyName = require('./utils/get-key-name.js');
const {fixSpaceAroundKeyword} = require('./fix/index.js');

const messages = {
	'known-method': 'Prefer using `{{constructorName}}.prototype.{{methodName}}`.',
	'unknown-method': 'Prefer using method from `{{constructorName}}.prototype`.',
};

const emptyObjectOrArrayMethodSelector = [
	'MemberExpression',
	matches([emptyObjectSelector('object'), emptyArraySelector('object')]),
].join('');
const selector = matches([
	// `[].foo.{apply,bind,call}(…)`
	// `({}).foo.{apply,bind,call}(…)`
	[
		methodCallSelector(['apply', 'bind', 'call']),
		' > ',
		'.callee',
		' > ',
		`${emptyObjectOrArrayMethodSelector}.object`,
	].join(''),
	// `Reflect.apply([].foo, …)`
	// `Reflect.apply({}.foo, …)`
	[
		methodCallSelector({object: 'Reflect', method: 'apply', minimumArguments: 1}),
		' > ',
		`${emptyObjectOrArrayMethodSelector}.arguments:first-child`,
	].join(''),
]);

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	return {
		[selector](node) {
			const constructorName = node.object.type === 'ArrayExpression' ? 'Array' : 'Object';
			const methodName = getKeyName(node, context.getScope());

			return {
				node,
				messageId: methodName ? 'known-method' : 'unknown-method',
				data: {constructorName, methodName: String(methodName)},
				* fix(fixer) {
					yield fixer.replaceText(node.object, `${constructorName}.prototype`);

					if (
						node.object
						&& (
							node.object.type === 'ArrayExpression'
							|| node.object.type === 'ObjectExpression'
						)
					) {
						yield * fixSpaceAroundKeyword(fixer, node.parent.parent, context.getSourceCode());
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
