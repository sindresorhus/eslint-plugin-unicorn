'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

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

const functionWhitelist = new Set([
	'Boolean'
]);

const calleeBlacklist = [
	'Promise',
	'React.children',
	'_',
	'Async',
	'async'
];

const isIteratorMethod = node => node.callee.property && iteratorMethods.has(node.callee.property.name);
const hasFunctionArgument = node => node.arguments.length > 0 && (node.arguments[0].type === 'Identifier' || node.arguments[0].type === 'CallExpression') && !functionWhitelist.has(node.arguments[0].name);

const getNumberOfArguments = node => node.callee.property && iteratorMethods.get(node.callee.property.name);
const parseArgument = (context, argument) => argument.type === 'Identifier' ? argument.name : context.getSourceCode().getText(argument);

const fix = (context, node) => {
	const numberOfArguments = getNumberOfArguments(node);
	const argument = node.arguments[0];
	const argumentString = numberOfArguments === 1 ? 'x' : 'a, b';

	return fixer => fixer.replaceText(argument, `${numberOfArguments === 1 ? argumentString : `(${argumentString})`} => ${parseArgument(context, argument)}(${argumentString})`);
};

const toSelector = name => {
	const splitted = name.split('.');
	return `[callee.${'object.'.repeat(splitted.length)}name!="${splitted.shift()}"]`;
};

// Select all the call expressions except the ones present in the blacklist
const selector = `CallExpression${calleeBlacklist.map(toSelector).join('')}`;

const create = context => ({
	[selector]: node => {
		if (
			isIteratorMethod(node) &&
			hasFunctionArgument(node) &&
			node.arguments.length <= getNumberOfArguments(node)
		) {
			const [argument] = node.arguments;

			context.report({
				node: argument,
				message: 'Do not pass a function reference directly to an iterator method.',
				fix: fix(context, node)
			});
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
