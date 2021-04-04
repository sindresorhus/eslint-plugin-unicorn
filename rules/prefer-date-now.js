'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_DEFAULT = 'prefer-date';
const MESSAGE_ID_METHOD = 'prefer-date-now-over-methods';
const MESSAGE_ID_NUMBER = 'prefer-date-now-over-number-data-object';
const messages = {
	[MESSAGE_ID_DEFAULT]: 'Prefer `Date.now()` over `new Date()`.',
	[MESSAGE_ID_METHOD]: 'Prefer `Date.now()` over `Date#{{method}}()`.',
	[MESSAGE_ID_NUMBER]: 'Prefer `Date.now()` over `Number(new Date())`.'
};

const createNewDateSelector = path => {
	const prefix = path ? `${path}.` : '';
	return [
		`[${prefix}type="NewExpression"]`,
		`[${prefix}callee.type="Identifier"]`,
		`[${prefix}callee.name="Date"]`,
		`[${prefix}arguments.length=0]`
	].join('');
};

const operatorsSelector = (...operators) => `:matches(${
	operators.map(operator => `[operator="${operator}"]`).join(', ')
})`;
const newDateSelector = createNewDateSelector();
const methodsSelector = [
	methodSelector({
		names: ['getTime', 'valueOf'],
		length: 0
	}),
	createNewDateSelector('callee.object')
].join('');
const builtinObjectSelector = [
	'CallExpression',
	'[callee.type="Identifier"]',
	':matches([callee.name="Number"], [callee.name="BigInt"])',
	'[arguments.length=1]',
	createNewDateSelector('arguments.0')
].join('');
// https://github.com/estree/estree/blob/master/es5.md#unaryoperator
const unaryExpressionsSelector = [
	'UnaryExpression',
	operatorsSelector('+', '-'),
	createNewDateSelector('argument')
].join('');
const assignmentExpressionSelector = [
	'AssignmentExpression',
	operatorsSelector('-=', '*=', '/=', '%=', '**='),
	'>',
	`${newDateSelector}.right`
].join('');
const binaryExpressionSelector = [
	'BinaryExpression',
	operatorsSelector('-', '*', '/', '%', '**'),
	// Both `left` and `right` properties
	'>',
	newDateSelector
].join('');

const create = context => {
	const report = (node, problem) => context.report({
		node,
		messageId: MESSAGE_ID_DEFAULT,
		fix: fixer => fixer.replaceText(node, 'Date.now()'),
		...problem
	});

	return {
		[methodsSelector](node) {
			const method = node.callee.property;
			report(node, {
				node: method,
				messageId: MESSAGE_ID_METHOD,
				data: {method: method.name}
			});
		},
		[builtinObjectSelector](node) {
			const {name} = node.callee;
			if (name === 'Number') {
				report(node, {
					messageId: MESSAGE_ID_NUMBER
				});
			} else {
				report(node.arguments[0]);
			}
		},
		[unaryExpressionsSelector](node) {
			report(node.operator === '-' ? node.argument : node);
		},
		[assignmentExpressionSelector](node) {
			report(node);
		},
		[binaryExpressionSelector](node) {
			report(node);
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
