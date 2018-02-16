'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const iteratorMethods = new Map([
	['map', 1],
	['forEach', 1],
	['every', 1],
	['filter', 1],
	['find', 1],
	['findIndex', 1],
	['some', 1],
	['reduce', 2],
	['reduceRight', 2]
]);

const whitelist = new Set([
	'Boolean'
]);

const isIteratorMethod = node => node.callee.property && iteratorMethods.has(node.callee.property.name);
const hasFunctionArgument = node => node.arguments.length > 0 && (node.arguments[0].type === 'Identifier' || node.arguments[0].type === 'CallExpression') && !whitelist.has(node.arguments[0].name);

const getNumberOfArguments = node => node.callee.property && iteratorMethods.get(node.callee.property.name);
const parseArgument = (context, arg) => arg.type === 'Identifier' ? arg.name : context.getSourceCode().getText(arg);

const fix = (context, node) => {
	const numberOfArgs = getNumberOfArguments(node);
	const arg = node.arguments[0];
	const argString = numberOfArgs === 1 ? 'x' : 'a, b';

	return fixer => fixer.replaceText(arg, `${numberOfArgs === 1 ? argString : `(${argString})`} => ${parseArgument(context, arg)}(${argString})`);
};

const create = context => ({
	'CallExpression[callee.object.name!="Promise"]': node => {
		if (isIteratorMethod(node) && hasFunctionArgument(node)) {
			const arg = node.arguments[0];

			context.report({
				node: arg,
				message: 'Do not pass a function reference directly to an iterator method.',
				fix: fix(context, node)
			});
		}
	}
});

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
