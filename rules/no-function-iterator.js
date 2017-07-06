'use strict';
const iteratorMethods = [
	'map',
	'forEach',
	'every',
	'filter',
	'find',
	'findIndex',
	'some'
];

const isIteratorMethod = node => node.callee.property && iteratorMethods.indexOf(node.callee.property.name) !== -1;
const hasFunctionArgument = node => node.arguments.length === 1 && (node.arguments[0].type === 'Identifier' || node.arguments[0].type === 'CallExpression');

const create = context => ({
	CallExpression: node => {
		const sourcecode = context.getSourceCode();

		if (isIteratorMethod(node) && hasFunctionArgument(node)) {
			const arg = node.arguments[0];

			context.report({
				node: arg,
				message: 'Do not pass a function directly to an iterator method.',
				fix: fixer => fixer.replaceText(arg, `x => ${sourcecode.getText(arg)}(x)`)
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
