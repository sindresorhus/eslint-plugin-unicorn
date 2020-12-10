'use strict';
const {hasSideEffect} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_FINDINDEX = 'findIndex';
const messages = {
	[MESSAGE_ID_FINDINDEX]: 'Use `.indexOf()`, rather than `.findIndex()`, when searching the index of an item.'
};

const getBinaryExpressionSelector = path => [
	`[${path}.type="BinaryExpression"]`,
	`[${path}.operator="==="]`,
	`:matches([${path}.left.type="Identifier"], [${path}.right.type="Identifier"])`
].join('');

const selector = [
	methodSelector({
		name: 'findIndex',
		length: 1
	}),
	`:matches(${
		[
			// Matches `foo.findIndex(bar => bar === baz)`
			[
				'[arguments.0.type="ArrowFunctionExpression"]',
				'[arguments.0.params.length=1]',
				'[arguments.0.params.0.type="Identifier"]',
				getBinaryExpressionSelector('arguments.0.body')
			].join(''),
			// Matches `foo.findIndex(bar => {return bar === baz})`
			// Matches `foo.findIndex(function (bar) {return bar === baz})`
			[
				':matches([arguments.0.type="ArrowFunctionExpression"], [arguments.0.type="FunctionExpression"])',
				'[arguments.0.params.length=1]',
				'[arguments.0.params.0.type="Identifier"]',
				'[arguments.0.body.type="BlockStatement"]',
				'[arguments.0.body.body.length=1]',
				'[arguments.0.body.body.0.type="ReturnStatement"]',
				getBinaryExpressionSelector('arguments.0.body.body.0.argument')
			].join('')
		].join(', ')
	})`
].join('');

const isIdentifierNamed = ({type, name}, expectName) => type === 'Identifier' && name === expectName;

const create = context => {
	const sourceCode = context.getSourceCode();
	const {scopeManager} = sourceCode;

	return {
		[selector](node) {
			const [callback] = node.arguments;
			const binaryExpression = callback.body.type === 'BinaryExpression' ?
				callback.body :
				callback.body.body[0].argument;
			const [parameter] = callback.params;
			const {left, right} = binaryExpression;

			const {name} = parameter;

			let passiveExpression;

			if (isIdentifierNamed(left, name)) {
				passiveExpression = right;
			} else if (isIdentifierNamed(right, name)) {
				passiveExpression = left;
			}

			if (
				!passiveExpression ||
				hasSideEffect(passiveExpression, sourceCode)
			) {
				return;
			}

			const passiveExpressionScope = scopeManager.acquire(callback);

			if (
				!passiveExpressionScope ||
				passiveExpressionScope.references.filter(reference => reference.identifier.name === name).length !== 1
			) {
				return;
			}

			const problem = {
				node: node.callee.property,
				messageId: MESSAGE_ID_FINDINDEX
			};

			const passiveExpressionText = sourceCode.getText(passiveExpression);
			problem.fix = function * (fixer) {
				yield fixer.replaceText(node.callee.property, 'indexOf');
				yield fixer.replaceText(node.arguments[0], passiveExpressionText);
			};

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
