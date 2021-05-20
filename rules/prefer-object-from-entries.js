'use strict';
const {isCommaToken, isArrowToken, isClosingParenToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const {matches, methodCallSelector} = require('./selectors');
const {getParentheses, getParenthesizedText} = require('./utils/parentheses');
const {isNodeMatches, isNodeMatchesNameOrPath} = require('./utils/is-node-matches');

const MESSAGE_ID_REDUCE = 'reduce';
const MESSAGE_ID_FUNCTION = 'function';
const messages = {
	[MESSAGE_ID_REDUCE]: 'Prefer `Object.fromEntries()` over `Array#reduce()`.',
	[MESSAGE_ID_FUNCTION]: 'Prefer `Object.fromEntries()` over `{{functionName}}()`.'
};

const createEmptyObjectSelector = path => {
	const prefix = path ? `${path}.` : '';

	return matches([
		// `{}`
		`[${prefix}type="ObjectExpression"][${prefix}properties.length=0]`,
		// `Object.create(null)`
		[
			methodCallSelector({path, object: 'Object', name: 'create', length: 1}),
			`[${prefix}arguments.0.type="Literal"]`,
			`[${prefix}arguments.0.raw="null"]`
		].join('')
	]);
};

// - `pairs.reduce((object) => {}, {})`
// - `pairs.reduce((object) => {}, Object.create(null))`
// - `pairs.reduce((object, element) => Object.assign(object, {[key]: value}), Object.create(null))`
const reduceEmptyObjectSelector = [
	methodCallSelector({name: 'reduce', length: 2}),
	'[arguments.0.type="ArrowFunctionExpression"]',
	'[arguments.0.async!=true]',
	'[arguments.0.generator!=true]',
	'[arguments.0.params.length>=1]',
	'[arguments.0.params.0.type="Identifier"]',
	createEmptyObjectSelector('arguments.1')
].join('');

const arrayReduceCases = [
	{
		selector: [
			reduceEmptyObjectSelector,
			// () => Object.assign(object, {[key]: value})
			methodCallSelector({path: 'arguments.0.body', object: 'Object', name: 'assign', length: 2}),
			'[arguments.0.body.arguments.0.type="Identifier"]',
			'[arguments.0.body.arguments.1.type="ObjectExpression"]',
			'[arguments.0.body.arguments.1.properties.length=1]'
		].join(''),
		getObject: node => node.arguments[0].body.arguments[0],
		getKey: node => node.arguments[0].body.arguments[1].properties[0].key,
		getValue: node => node.arguments[0].body.arguments[1].properties[0].value
	},
	{
		selector: [
			reduceEmptyObjectSelector,
			// () => ({...object, [key]: value})
			'[arguments.0.body.type="ObjectExpression"]',
			'[arguments.0.body.properties.length=2]',
			'[arguments.0.body.properties.0.type="SpreadElement"]',
			'[arguments.0.body.properties.0.argument.type="Identifier"]'
		].join(''),
		getObject: node => node.arguments[0].body.properties[0].argument,
		getKey: node => node.arguments[0].body.properties[1].key,
		getValue: node => node.arguments[0].body.properties[1].value
	}
];

// `_.flatten(array)`
const lodashPairsFunctions = [
	'_.pairs',
	'lodash.pairs',
	'underscore.pairs'
];
const anyCall = [
	'CallExpression',
	'[optional!=true]',
	'[arguments.length=1]',
	'[arguments.0.type!="SpreadElement"]',
	' > .callee'
].join('');

function fixReduceAssignOrSpread({sourceCode, node, key, value}) {
	function removeInitObject(fixer) {
		const initObject = node.arguments[1];
		const parentheses = getParentheses(initObject, sourceCode);
		const firstToken = parentheses[0] || initObject;
		const lastToken = parentheses[parentheses.length - 1] || initObject;
		const startToken = sourceCode.getTokenBefore(firstToken);
		const [start] = startToken.range;
		const [, end] = lastToken.range;
		return fixer.replaceTextRange([start, end], '');
	}

	function * removeFirstParameter(fixer) {
		const parameters = node.arguments[0].params;
		const [firstParameter] = parameters;
		const tokenAfter = sourceCode.getTokenAfter(firstParameter);

		if (isCommaToken(tokenAfter)) {
			yield fixer.remove(tokenAfter);
		}

		let shouldAddParentheses = false;
		if (parameters.length === 1) {
			const arrowToken = sourceCode.getTokenAfter(firstParameter, isArrowToken);
			const tokenBeforeArrowToken = sourceCode.getTokenBefore(arrowToken);

			if (!isClosingParenToken(tokenBeforeArrowToken)) {
				shouldAddParentheses = true;
			}
		}

		yield fixer.replaceText(firstParameter, shouldAddParentheses ? '()' : '');
	}

	function getKeyValueText() {
		let keyText = getParenthesizedText(key, sourceCode);
		const valueText = getParenthesizedText(value, sourceCode);

		if (!key.parent.computed && key.type === 'Identifier') {
			keyText = `'${keyText}'`;
		}

		return {keyText, valueText};
	}

	function * replaceFunctionBody(fixer) {
		const functionBody = node.arguments[0].body;
		const {keyText, valueText} = getKeyValueText();
		yield fixer.replaceText(functionBody, `[${keyText}, ${valueText}]`);

		for (const parentheses of getParentheses(functionBody, sourceCode)) {
			yield fixer.remove(parentheses);
		}
	}

	return function * (fixer) {
		// Wrap `array.reduce()` with `Object.fromEntries()`,
		yield fixer.insertTextBefore(node, 'Object.fromEntries(');
		yield fixer.insertTextAfter(node, ')');

		// Switch `.reduce` to `.map`
		yield fixer.replaceText(node.callee.property, 'map');

		// Remove empty object
		yield removeInitObject(fixer);

		// Remove the first parameter
		yield * removeFirstParameter(fixer);

		// Replace function body
		yield * replaceFunctionBody(fixer);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {functions: configFunctions} = {
		functions: [],
		...context.options[0]
	};
	const functions = [...configFunctions, ...lodashPairsFunctions];
	const sourceCode = context.getSourceCode();
	const listeners = {};

	for (const {selector, getObject, getKey, getValue} of arrayReduceCases) {
		listeners[selector] = function (node) {
			const objectParameter = node.arguments[0].params[0];
			const objectAssigning = getObject(node);

			if (objectParameter.name !== objectAssigning.name) {
				return;
			}

			context.report({
				node: node.callee.property,
				messageId: MESSAGE_ID_REDUCE,
				fix: fixReduceAssignOrSpread({
					sourceCode,
					node,
					key: getKey(node),
					value: getValue(node)
				})
			});
		};
	}

console.log({functions})
	listeners[anyCall] = function(node) {
		if (!isNodeMatches(node, functions)) {
			return;
		}

		const functionName = functions.find(nameOrPath => isNodeMatchesNameOrPath(node, nameOrPath)).trim();
		context.report({
			node,
			messageId: MESSAGE_ID_FUNCTION,
			data: {functionName},
			fix: fixer => fixer.replaceText(node, 'Object.fromEntries')
		})
	};


	return listeners;
};

const schema = [
	{
		type: 'object',
		properties: {
			functions: {
				type: 'array',
				uniqueItems: true
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer use `Object.fromEntries(…)` to transform a list of key-value pairs into an object.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
