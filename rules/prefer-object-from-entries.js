import {isCommaToken, isArrowToken, isClosingParenToken} from '@eslint-community/eslint-utils';
import {isMethodCall, isNullLiteral, isEmptyObjectExpression} from './ast/index.js';
import {removeParentheses} from './fix/index.js';
import {
	getNextNode,
	getParentheses,
	getParenthesizedText,
	getVariableIdentifiers,
	isNodeMatchesNameOrPath,
	isSameIdentifier,
} from './utils/index.js';
import {isCallExpression} from './ast/call-or-new-expression.js';

const MESSAGE_ID_REDUCE = 'reduce';
const MESSAGE_ID_FUNCTION = 'function';
const MESSAGE_ID_LOOP = 'loop';
const messages = {
	[MESSAGE_ID_REDUCE]: 'Prefer `Object.fromEntries()` over `Array#reduce()`.',
	[MESSAGE_ID_FUNCTION]: 'Prefer `Object.fromEntries()` over `{{functionName}}()`.',
	[MESSAGE_ID_LOOP]: 'Prefer `Object.fromEntries()` over a `for-of` loop.',
};

const isEmptyObject = node =>
	// `{}`
	isEmptyObjectExpression(node)
	// `Object.create(null)`
	|| (
		isMethodCall(node, {
			object: 'Object',
			method: 'create',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		&& isNullLiteral(node.arguments[0])
	);

const isArrowFunctionCallback = node =>
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& node.params.length > 0
	&& node.params[0].type === 'Identifier';

const isProperty = node =>
	node.type === 'Property'
	&& node.kind === 'init'
	&& !node.method;

const isBlockWithOneExpressionStatement = node =>
	node.type === 'BlockStatement'
	&& node.body.length === 1
	&& node.body[0].type === 'ExpressionStatement';

const getOnlyLoopAssignmentExpression = loop => {
	if (!isBlockWithOneExpressionStatement(loop.body)) {
		return;
	}

	const [{expression}] = loop.body.body;

	if (expression.type === 'AssignmentExpression') {
		return expression;
	}
};

const getForOfLeftPattern = node => {
	if (
		node.type === 'VariableDeclaration'
		&& (node.kind === 'const' || node.kind === 'let')
		&& node.declarations.length === 1
	) {
		return node.declarations[0].id;
	}
};

const isPairPattern = node =>
	node.type === 'ArrayPattern'
	&& node.elements.length === 2
	&& node.elements.every(element => element?.type === 'Identifier');

const declaresVariableNamed = (node, name, context) =>
	context.sourceCode.getDeclaredVariables(node).some(variable => variable.name === name);

const referencesVariable = (variable, node, context) => {
	const range = context.sourceCode.getRange(node);

	return getVariableIdentifiers(variable).some(identifier => {
		const [start, end] = context.sourceCode.getRange(identifier);

		return start >= range[0] && end <= range[1];
	});
};

// - `pairs.reduce(…, {})`
// - `pairs.reduce(…, Object.create(null))`
const isArrayReduceWithEmptyObject = node =>
	isMethodCall(node, {
		method: 'reduce',
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
	})
	&& isEmptyObject(node.arguments[1]);

const fixableArrayReduceCases = [
	{
		test: callExpression =>
			isArrayReduceWithEmptyObject(callExpression)
			// `() => Object.assign(object, {key})`
			&& isArrowFunctionCallback(callExpression.arguments[0])
			&& isMethodCall(callExpression.arguments[0].body, {
				object: 'Object',
				method: 'assign',
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			&& callExpression.arguments[0].body.arguments[1].type === 'ObjectExpression'
			&& callExpression.arguments[0].body.arguments[1].properties.length === 1
			&& isProperty(callExpression.arguments[0].body.arguments[1].properties[0])
			&& isSameIdentifier(callExpression.arguments[0].params[0], callExpression.arguments[0].body.arguments[0]),
		getProperty: callback => callback.body.arguments[1].properties[0],
	},
	{
		test: callExpression =>
			isArrayReduceWithEmptyObject(callExpression)
			// `() => ({...object, key})`
			&& isArrowFunctionCallback(callExpression.arguments[0])
			&& callExpression.arguments[0].body.type === 'ObjectExpression'
			&& callExpression.arguments[0].body.properties.length === 2
			&& callExpression.arguments[0].body.properties[0].type === 'SpreadElement'
			&& isProperty(callExpression.arguments[0].body.properties[1])
			&& isSameIdentifier(callExpression.arguments[0].params[0], callExpression.arguments[0].body.properties[0].argument),
		getProperty: callback => callback.body.properties[1],
	},
];

// `_.flatten(array)`
const lodashFromPairsFunctions = [
	'_.fromPairs',
	'lodash.fromPairs',
];

function fixReduceAssignOrSpread({context, callExpression, property}) {
	const {sourceCode} = context;
	const removeInitObject = fixer => {
		const initObject = callExpression.arguments[1];
		const parentheses = getParentheses(initObject, context);
		const firstToken = parentheses[0] || initObject;
		const lastToken = parentheses.at(-1) || initObject;
		const startToken = sourceCode.getTokenBefore(firstToken);
		const [start] = sourceCode.getRange(startToken);
		const [, end] = sourceCode.getRange(lastToken);
		return fixer.removeRange([start, end]);
	};

	function * removeFirstParameter(fixer) {
		const parameters = callExpression.arguments[0].params;
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

	const getKeyValueText = () => {
		const {key, value} = property;
		let keyText = getParenthesizedText(key, context);
		const valueText = getParenthesizedText(value, context);

		if (!property.computed && key.type === 'Identifier') {
			keyText = `'${keyText}'`;
		}

		return {keyText, valueText};
	};

	function * replaceFunctionBody(fixer) {
		const functionBody = callExpression.arguments[0].body;
		const {keyText, valueText} = getKeyValueText();
		yield fixer.replaceText(functionBody, `[${keyText}, ${valueText}]`);
		yield removeParentheses(functionBody, fixer, context);
	}

	return function * (fixer) {
		// Wrap `array.reduce()` with `Object.fromEntries()`
		yield fixer.insertTextBefore(callExpression, 'Object.fromEntries(');
		yield fixer.insertTextAfter(callExpression, ')');

		// Switch `.reduce` to `.map`
		yield fixer.replaceText(callExpression.callee.property, 'map');

		// Remove empty object
		yield removeInitObject(fixer);

		// Remove the first parameter
		yield removeFirstParameter(fixer);

		// Replace function body
		yield replaceFunctionBody(fixer);
	};
}

const matchesForOfLoop = (id, loopLeft, assignmentExpression) => {
	if (
		assignmentExpression.operator !== '='
		|| assignmentExpression.left.type !== 'MemberExpression'
		|| !assignmentExpression.left.computed
		|| !isPairPattern(loopLeft)
	) {
		return false;
	}

	const {object, property} = assignmentExpression.left;
	const [key, value] = loopLeft.elements;

	return isSameIdentifier(id, object)
		&& isSameIdentifier(key, property)
		&& isSameIdentifier(value, assignmentExpression.right);
};

const getForOfLoopProblem = (declaration, context) => {
	if (
		declaration.declarations.length !== 1
		|| declaration.declarations[0].id.type !== 'Identifier'
		|| !declaration.declarations[0].init
		|| !isEmptyObjectExpression(declaration.declarations[0].init)
	) {
		return;
	}

	const [declarator] = declaration.declarations;
	const {id} = declarator;
	const loop = getNextNode(declaration, context);

	if (loop?.type !== 'ForOfStatement' || loop.await) {
		return;
	}

	const loopLeft = getForOfLeftPattern(loop.left);
	if (!loopLeft) {
		return;
	}

	if (declaresVariableNamed(loop.left, id.name, context)) {
		return;
	}

	const variable = context.sourceCode.getDeclaredVariables(declarator)[0];
	if (
		variable
		&& referencesVariable(variable, loop.right, context)
	) {
		return;
	}

	const assignmentExpression = getOnlyLoopAssignmentExpression(loop);
	if (
		!assignmentExpression
		|| !matchesForOfLoop(id, loopLeft, assignmentExpression)
	) {
		return;
	}

	return {
		node: loop,
		messageId: MESSAGE_ID_LOOP,
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const {sourceCode} = context;
	const {functions: configFunctions} = context.options[0];
	const functions = [...configFunctions, ...lodashFromPairsFunctions];

	context.on('VariableDeclaration', declaration => getForOfLoopProblem(declaration, context));

	context.on('CallExpression', function * (callExpression) {
		for (const {test, getProperty} of fixableArrayReduceCases) {
			if (!test(callExpression)) {
				continue;
			}

			const [callbackFunction] = callExpression.arguments;
			const [firstParameter] = callbackFunction.params;
			const variables = sourceCode.getDeclaredVariables(callbackFunction);
			const firstParameterVariable = variables.find(variable => variable.identifiers.length === 1 && variable.identifiers[0] === firstParameter);
			if (!firstParameterVariable || firstParameterVariable.references.length !== 1) {
				continue;
			}

			const problem = {
				node: callExpression.callee.property,
				messageId: MESSAGE_ID_REDUCE,
			};

			if (!callExpression.typeArguments) {
				problem.fix = fixReduceAssignOrSpread({
					context,
					callExpression,
					property: getProperty(callbackFunction),
				});
			}

			yield problem;
		}

		if (!isCallExpression(callExpression, {
			argumentsLength: 1,
			optional: false,
		})) {
			return;
		}

		const functionNode = callExpression.callee;
		for (const nameOrPath of functions) {
			const functionName = nameOrPath.trim();
			if (isNodeMatchesNameOrPath(functionNode, functionName)) {
				yield {
					node: functionNode,
					messageId: MESSAGE_ID_FUNCTION,
					data: {functionName},
					fix: fixer => fixer.replaceText(functionNode, 'Object.fromEntries'),
				};
			}
		}
	});
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			functions: {
				type: 'array',
				uniqueItems: true,
				description: 'Additional functions to check.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `Object.fromEntries(…)` to transform a list of key-value pairs into an object.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{functions: []}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
