'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_DEFAULT = 'prefer-date';
const MESSAGE_ID_METHOD = 'prefer-date-now-over-methods';
const MESSAGE_ID_NUMBER = 'prefer-date-now-over-number-data-object';
const messages = {
	[MESSAGE_ID_DEFAULT]: 'Prefer `Date.now()`.',
	[MESSAGE_ID_METHOD]: 'Prefer `Date.now()` over `Date#{{name}}()`.',
	[MESSAGE_ID_NUMBER]: 'Prefer `Date.now()` over `Number(new Date())`.',
};

const createNewDateSelector = path => {
	const prefix = property ? `${property}.` : '';
	return [
		`[${prefix}type="NewExpression"]`,
		`[${prefix}callee.type="Identifier"]`,
		`[${prefix}callee.name="Date"]`,
		`[${prefix}callee.arguments.length=0]`
	].join('');
};
const operatorsSelector = (...operators) => `:matches(${
	operators.map(operator => `[operator="${operator}"]`)
})`
const newDateSelector = createNewDateSelector();
const methodsSelector = [
	methodSelector({
		names: ['getTime', 'valueOf'],
		length: 0
	}),
	createNewDateSelector('callee.object'),
].join('');
const constructorsSelector = [
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
	newDateSelector('argument')
].join('');
const assignmentExpression = [
	'AssignmentExpression',
	operatorsSelector('-=', '*=', '/=', '%=', '**='),
	`${newDateSelector}.right`
].join('');

const create = context => {
	const report = (node, problem) => context.report({
			node,
			messageId: MESSAGE_ID_DEFAULT,
			fix: fixer => fixer.replaceText(node, 'Date.now()'),
			...problem
		})

	return {
		[methodsSelector](node) {
			const method = node.callee.property;
			report(node, {
				node: method,
				messageId: MESSAGE_ID_METHOD,
			});
		}
		[constructorsSelector](node) {
			const {name} = node.callee;
			if (name === 'number') {
				report(node, {
					node: method,
					messageId: MESSAGE_ID_NUMBER,
				});
			} else {
				report(node.arguments[0], {
					node: method,
					messageId: MESSAGE_ID_NUMBER,
				});
			}
		},
		[unaryExpressionsSelector](node) {
			node = node.operator === '-' ? node.argument : node;
			report(node);
		},
		[assignmentExpression](node) {
			report(node);
		},
	}
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
