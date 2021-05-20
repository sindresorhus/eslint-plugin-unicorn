'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const {
	methodCallSelector,
	arrayPrototypeMethodSelector,
	emptyArraySelector,
	callExpressionSelector,
} = require('./selectors');
const needsSemicolon = require('./utils/needs-semicolon');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');
const {isNodeMatches, isNodeMatchesNameOrPath} = require('./utils/is-node-matches');

const MESSAGE_ID = 'prefer-array-flat';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array#flat()` over `{{description}}` to flatten an array.'
};

// `array.flatMap(x => x)`
const arrayFlatMap = {
	selector: [
		methodCallSelector({
			name: 'flatMap',
			length: 1
		}),
		'[arguments.0.type="ArrowFunctionExpression"]',
		'[arguments.0.async=false]',
		'[arguments.0.generator=false]',
		'[arguments.0.params.length=1]',
		'[arguments.0.params.0.type="Identifier"]',
		'[arguments.0.body.type="Identifier"]'
	].join(''),
	testFunction: node => node.arguments[0].params[0].name === node.arguments[0].body.name,
	getArrayNode: node => node.callee.object,
	description: 'Array#flatMap()'
};

// `array.reduce((a, b) => a.concat(b), [])`
const arrayReduce = {
	selector: [
		methodCallSelector({
			name: 'reduce',
			length: 2
		}),
		'[arguments.0.type="ArrowFunctionExpression"]',
		'[arguments.0.async=false]',
		'[arguments.0.generator=false]',
		'[arguments.0.params.length=2]',
		'[arguments.0.params.0.type="Identifier"]',
		'[arguments.0.params.1.type="Identifier"]',
		methodCallSelector({
			name: 'concat',
			length: 1,
			path: 'arguments.0.body'
		}),
		'[arguments.0.body.callee.object.type="Identifier"]',
		'[arguments.0.body.arguments.0.type="Identifier"]',
		emptyArraySelector('arguments.1')
	].join(''),
	testFunction: node => node.arguments[0].params[0].name === node.arguments[0].body.callee.object.name &&
		node.arguments[0].params[1].name === node.arguments[0].body.arguments[0].name,
	getArrayNode: node => node.callee.object,
	description: 'Array#reduce()'
};

// `array.reduce((a, b) => [...a, ...b], [])`
const arrayReduce2 = {
	selector: [
		methodCallSelector({
			name: 'reduce',
			length: 2
		}),
		'[arguments.0.type="ArrowFunctionExpression"]',
		'[arguments.0.async=false]',
		'[arguments.0.generator=false]',
		'[arguments.0.params.length=2]',
		'[arguments.0.params.0.type="Identifier"]',
		'[arguments.0.params.1.type="Identifier"]',
		'[arguments.0.body.type="ArrayExpression"]',
		'[arguments.0.body.elements.length=2]',
		'[arguments.0.body.elements.0.type="SpreadElement"]',
		'[arguments.0.body.elements.0.argument.type="Identifier"]',
		'[arguments.0.body.elements.1.type="SpreadElement"]',
		'[arguments.0.body.elements.1.argument.type="Identifier"]',
		emptyArraySelector('arguments.1')
	].join(''),
	testFunction: node => node.arguments[0].params[0].name === node.arguments[0].body.elements[0].argument.name &&
		node.arguments[0].params[1].name === node.arguments[0].body.elements[1].argument.name,
	getArrayNode: node => node.callee.object,
	description: 'Array#reduce()'
};

// `[].concat(array)` and `[].concat(...array)`
const emptyArrayConcat = {
	selector: [
		methodCallSelector({
			name: 'concat',
			length: 1,
			allowSpreadElement: true
		}),
		emptyArraySelector('callee.object')
	].join(''),
	getArrayNode: node => {
		const argumentNode = node.arguments[0];
		return argumentNode.type === 'SpreadElement' ? argumentNode.argument : argumentNode;
	},
	description: '[].concat()'
};

// `[].concat.apply([], array)` and `Array.prototype.concat.apply([], array)`
const arrayPrototypeConcat = {
	selector: [
		methodCallSelector({
			name: 'apply',
			length: 2
		}),
		emptyArraySelector('arguments.0'),
		arrayPrototypeMethodSelector({
			path: 'callee.object',
			name: 'concat'
		})
	].join(''),
	getArrayNode: node => node.arguments[1],
	description: 'Array.prototype.concat()'
};

// `_.flatten(array)`
const lodashFlatten = {
	selector: methodCallSelector({
		objects: ['_', 'lodash', 'underscore'],
		name: 'flatten',
		length: 1
	}),
	getArrayNode: node => node.arguments[0],
	description: node => `${node.callee.object.name}.flatten()`
};

const anyCall = {
	selector: callExpressionSelector({length: 1}),
	getArrayNode: node => node.arguments[0]
};

function fix(node, array, sourceCode) {
	return fixer => {
		let fixed = sourceCode.getText(array);
		if (shouldAddParenthesesToMemberExpressionObject(array, sourceCode)) {
			fixed = `(${fixed})`;
		}

		fixed = `${fixed}.flat()`;

		const tokenBefore = sourceCode.getTokenBefore(node);
		if (needsSemicolon(tokenBefore, sourceCode, fixed)) {
			fixed = `;${fixed}`;
		}

		return fixer.replaceText(node, fixed);
	};
}

function create(context) {
	const {functions} = {
		functions: [],
		...context.options[0]
	};
	const sourceCode = context.getSourceCode();
	const listeners = {};

	const cases = [
		arrayFlatMap,
		arrayReduce,
		arrayReduce2,
		emptyArrayConcat,
		arrayPrototypeConcat,
		lodashFlatten
	];

	if (functions.length > 0) {
		cases.push({
			...anyCall,
			testFunction: node => isNodeMatches(node.callee, functions),
			description: node => `${functions.find(nameOrPath => isNodeMatchesNameOrPath(node.callee, nameOrPath)).trim()}()`
		});
	}

	for (const {selector, testFunction, description, getArrayNode} of cases) {
		listeners[selector] = function (node) {
			if (testFunction && !testFunction(node)) {
				return;
			}

			const array = getArrayNode(node);

			const data = {
				description: typeof description === 'string' ? description : description(node)
			};

			const problem = {
				node,
				messageId: MESSAGE_ID,
				data
			};

			// Don't fix if it has comments.
			if (
				sourceCode.getCommentsInside(node).length ===
				sourceCode.getCommentsInside(array).length
			) {
				problem.fix = fix(node, array, sourceCode);
			}

			context.report(problem);
		};
	}

	return listeners;
}

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
			description: 'Prefer `Array#flat()` over legacy techniques to flatten arrays.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
