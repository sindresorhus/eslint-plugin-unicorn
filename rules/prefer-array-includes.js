'use strict';
const {hasSideEffect, isParenthesized, findVariable} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const getVariableIdentifiers = require('./utils/get-variable-identifiers');
const getReferences = require('./utils/get-references');

const MESSAGE_ID_SOME = 'some';
const MESSAGE_ID_REPLACE = 'replaceSome';
const messages = {
	[MESSAGE_ID_SOME]: 'Use `.includes()` instead of `.some()` when looking for a well known item.',
	[MESSAGE_ID_REPLACE]: 'Replace `.some()` with `.includes()`.'
};

const getBinaryExpressionSelector = path => [
	`[${path}.type="BinaryExpression"]`,
	`[${path}.operator="==="]`,
	`:matches([${path}.left.type="Identifier"], [${path}.right.type="Identifier"])`
].join('');
const getFunctionSelector = path => [
	`[${path}.generator=false]`,
	`[${path}.async=false]`,
	`[${path}.params.length=1]`,
	`[${path}.params.0.type="Identifier"]`
].join('');
const selector = [
	methodSelector({
		name: 'some',
		length: 1
	}),
	`:matches(${
		[
			// Matches `foo.some(bar => bar === baz)`
			[
				'[arguments.0.type="ArrowFunctionExpression"]',
				getFunctionSelector('arguments.0'),
				getBinaryExpressionSelector('arguments.0.body')
			].join(''),
			// Matches `foo.some(bar => {return bar === baz})`
			// Matches `foo.some(function (bar) {return bar === baz})`
			[
				':matches([arguments.0.type="ArrowFunctionExpression"], [arguments.0.type="FunctionExpression"])',
				getFunctionSelector('arguments.0'),
				'[arguments.0.body.type="BlockStatement"]',
				'[arguments.0.body.body.length=1]',
				'[arguments.0.body.body.0.type="ReturnStatement"]',
				getBinaryExpressionSelector('arguments.0.body.body.0.argument')
			].join('')
		].join(', ')
	})`
].join('');

const isIdentifierNamed = ({type, name}, expectName) => type === 'Identifier' && name === expectName;

function isVariablesInCallbackUsed(scopeManager, callback, parameterInBinaryExpression) {
	const scope = scopeManager.acquire(callback);

	// `parameter` is used on somewhere else
	const [parameter] = callback.params;
	if (
		getVariableIdentifiers(findVariable(scope, parameter))
			.some(identifier => identifier !== parameter && identifier !== parameterInBinaryExpression)
	) {
		return true;
	}

	// `call` is done
	if (getReferences(scope).some(reference => reference.identifier.name === 'call' && !reference.resolved)) {
		return true;
	}

	if (callback.type === 'FunctionExpression') {
		// `this` is used
		if (scope.thisFound) {
			return true;
		}

		// The function name is used
		if (
			callback.id &&
			getVariableIdentifiers(findVariable(scope, callback.id))
				.some(identifier => identifier !== callback.id)
		) {
			return true;
		}

		// `arguments` is used
		if (getReferences(scope).some(({identifier: {name}}) => name === 'arguments')) {
			return true;
		}
	}
}

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

			let searchValueNode;
			let parameterInBinaryExpression;
			if (isIdentifierNamed(left, name)) {
				searchValueNode = right;
				parameterInBinaryExpression = left;
			} else if (isIdentifierNamed(right, name)) {
				searchValueNode = left;
				parameterInBinaryExpression = right;
			} else {
				return;
			}

			if (isVariablesInCallbackUsed(scopeManager, callback, parameterInBinaryExpression)) {
				return;
			}

			const method = node.callee.property;
			const problem = {
				node: method,
				messageId: MESSAGE_ID_SOME,
				suggest: []
			};

			function * fix(fixer) {
				let text = sourceCode.getText(searchValueNode);
				if (isParenthesized(searchValueNode, sourceCode) && !isParenthesized(callback, sourceCode)) {
					text = `(${text})`;
				}

				yield fixer.replaceText(method, 'includes');
				yield fixer.replaceText(callback, text);
			}

			if (hasSideEffect(searchValueNode, sourceCode)) {
				problem.suggest.push({messageId: MESSAGE_ID_REPLACE, fix});
			} else {
				problem.fix = fix;
			}

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
