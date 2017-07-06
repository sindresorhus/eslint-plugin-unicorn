'use strict';
const iteratorMethods = new Set([
	'map',
	'forEach',
	'every',
	'filter',
	'find',
	'findIndex',
	'some'
]);

const isIteratorMethod = node => node.callee.property && iteratorMethods.has(node.callee.property.name);
const hasFunctionArgument = node => node.arguments.length === 1 && (node.arguments[0].type === 'Identifier' || node.arguments[0].type === 'CallExpression');

const parseArgument = (context, arg) => arg.type === 'Identifier' ? arg.name : context.getSourceCode().getText(arg);

const create = context => ({
	CallExpression: node => {
		if (isIteratorMethod(node) && hasFunctionArgument(node)) {
			const arg = node.arguments[0];

			context.report({
				node: arg,
				message: 'Do not pass a function reference directly to an iterator method.',
				fix: fixer => fixer.replaceText(arg, `x => ${parseArgument(context, arg)}(x)`)
			});
		}
	}
});

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
