import {findVariable} from '@eslint-community/eslint-utils';
import {
	getParenthesizedText,
	isArrayPrototypeProperty,
	isNodeMatches,
	isNodeMatchesNameOrPath,
	isParenthesized,
	isSameIdentifier,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isMethodCall, isCallExpression, isEmptyArrayExpression} from './ast/index.js';

const MESSAGE_ID = 'prefer-array-flat';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array#flat()` over `{{description}}` to flatten an array.',
};

// `array.flatMap(x => x)`
const arrayFlatMap = {
	getArrayNode: node => node.callee.object,
	isOptionalArray: node => node.callee.optional,
	description: 'Array#flatMap()',
	testFunction(node, context) {
		if (!isMethodCall(node, {
			method: 'flatMap',
			argumentsLength: 1,
			optionalCall: false,
		})) {
			return false;
		}

		const [firstArgument] = node.arguments;
		return (
			firstArgument.type === 'ArrowFunctionExpression'
			&& !firstArgument.async
			&& firstArgument.params.length === 1
			&& isSameIdentifier(firstArgument.params[0], firstArgument.body)
			&& !isObviouslyNonArrayFlatMapReceiver(node.callee.object, context)
		);
	},
};

// `array.reduce((a, b) => a.concat(b), [])`
// `array?.reduce((a, b) => a.concat(b), [])`
// `array.reduce((a, b) => [...a, ...b], [])`
// `array?.reduce((a, b) => [...a, ...b], [])`
const arrayReduce = {
	testFunction(node) {
		if (!isMethodCall(node, {
			method: 'reduce',
			argumentsLength: 2,
			optionalCall: false,
		})) {
			return false;
		}

		const [firstArgument, secondArgument] = node.arguments;
		if (!(
			firstArgument.type === 'ArrowFunctionExpression'
			&& !firstArgument.async
			&& firstArgument.params.length === 2
			&& isEmptyArrayExpression(secondArgument)
		)) {
			return false;
		}

		const firstArgumentBody = firstArgument.body;
		const [firstParameter, secondParameter] = firstArgument.params;
		return (
			// `(a, b) => a.concat(b)`
			(
				isMethodCall(firstArgumentBody, {
					method: 'concat',
					argumentsLength: 1,
					optionalCall: false,
					optionalMember: false,
				})
				&& isSameIdentifier(firstParameter, firstArgumentBody.callee.object)
				&& isSameIdentifier(secondParameter, firstArgumentBody.arguments[0])
			)
			// `(a, b) => [...a, ...b]`
			|| (
				firstArgumentBody.type === 'ArrayExpression'
				&& firstArgumentBody.elements.length === 2
				&& firstArgumentBody.elements.every((node, index) =>
					node?.type === 'SpreadElement'
					&& node.argument.type === 'Identifier'
					&& isSameIdentifier(firstArgument.params[index], node.argument),
				)
			)
		);
	},
	getArrayNode: node => node.callee.object,
	isOptionalArray: node => node.callee.optional,
	description: 'Array#reduce()',
};

// `[].concat(maybeArray)`
// `[].concat(...array)`
const emptyArrayConcat = {
	testFunction(node) {
		return isMethodCall(node, {
			method: 'concat',
			argumentsLength: 1,
			allowSpreadElement: true,
			optionalCall: false,
			optionalMember: false,
		})
		&& isEmptyArrayExpression(node.callee.object);
	},
	getArrayNode(node) {
		const argumentNode = node.arguments[0];
		return argumentNode.type === 'SpreadElement' ? argumentNode.argument : argumentNode;
	},
	description: '[].concat()',
	shouldSwitchToArray: node => node.arguments[0].type !== 'SpreadElement',
};

// - `[].concat.apply([], array)` and `Array.prototype.concat.apply([], array)`
// - `[].concat.call([], maybeArray)` and `Array.prototype.concat.call([], maybeArray)`
// - `[].concat.call([], ...array)` and `Array.prototype.concat.call([], ...array)`
const arrayPrototypeConcat = {
	testFunction(node) {
		if (!(
			isMethodCall(node, {
				methods: ['apply', 'call'],
				argumentsLength: 2,
				allowSpreadElement: true,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayPrototypeProperty(node.callee.object, {
				property: 'concat',
			})
		)) {
			return false;
		}

		const [firstArgument, secondArgument] = node.arguments;
		return isEmptyArrayExpression(firstArgument)
			&& (
				node.callee.property.name === 'call'
				|| secondArgument.type !== 'SpreadElement'
			);
	},
	getArrayNode(node) {
		const argumentNode = node.arguments[1];
		return argumentNode.type === 'SpreadElement' ? argumentNode.argument : argumentNode;
	},
	description: 'Array.prototype.concat()',
	shouldSwitchToArray: node => node.arguments[1].type !== 'SpreadElement' && node.callee.property.name === 'call',
};

const lodashFlattenFunctions = [
	'_.flatten',
	'lodash.flatten',
	'underscore.flatten',
];

const pascalCaseNamePattern = /^\p{Lu}/u;
const isPascalCaseIdentifier = node =>
	node.type === 'Identifier'
	&& pascalCaseNamePattern.test(node.name);

const isKnownNonArrayConstruction = node =>
	node.type === 'NewExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name !== 'Array';

const isDefinitelyArrayExpression = node => (
	node.type === 'ArrayExpression'
	|| (
		node.type === 'NewExpression'
		&& node.callee.type === 'Identifier'
		&& node.callee.name === 'Array'
	)
);

const isDefinitelyNonArrayExpression = node => (
	node.type === 'ObjectExpression'
	|| node.type === 'Literal'
	|| node.type === 'TemplateLiteral'
	|| node.type === 'ArrowFunctionExpression'
	|| node.type === 'FunctionExpression'
	|| node.type === 'ClassExpression'
	|| isKnownNonArrayConstruction(node)
);

const getConstVariableInitializer = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.node.type !== 'VariableDeclarator'
		|| definition.parent.type !== 'VariableDeclaration'
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	return definition.node.init;
};

const isConstNonArrayVariable = (node, context) => {
	const initializer = getConstVariableInitializer(node, context);
	return Boolean(initializer && isDefinitelyNonArrayExpression(initializer));
};

const isConstArrayVariable = (node, context) => {
	const initializer = getConstVariableInitializer(node, context);
	return Boolean(initializer && isDefinitelyArrayExpression(initializer));
};

const isObviouslyNonArrayFlatMapReceiver = (node, context) =>
	(isPascalCaseIdentifier(node) && !isConstArrayVariable(node, context))
	|| isConstNonArrayVariable(node, context);

function fix(node, array, context, shouldSwitchToArray, optional) {
	if (typeof shouldSwitchToArray === 'function') {
		shouldSwitchToArray = shouldSwitchToArray(node);
	}

	return function * (fixer) {
		const {sourceCode} = context;
		let fixed = getParenthesizedText(array, context);
		if (shouldSwitchToArray) {
			// `array` is an argument, when it changes to `array[]`, we don't need add extra parentheses
			fixed = `[${fixed}]`;
			// And we don't need to add parentheses to the new array to call `.flat()`
		} else if (
			!isParenthesized(array, sourceCode)
			&& shouldAddParenthesesToMemberExpressionObject(array, context)
		) {
			fixed = `(${fixed})`;
		}

		fixed = `${fixed}${optional ? '?' : ''}.flat()`;

		const tokenBefore = sourceCode.getTokenBefore(node);
		if (needsSemicolon(tokenBefore, context, fixed)) {
			fixed = `;${fixed}`;
		}

		yield fixer.replaceText(node, fixed);

		yield fixSpaceAroundKeyword(fixer, node, context);
	};
}

function create(context) {
	const {functions: configFunctions} = context.options[0];
	const functions = [...configFunctions, ...lodashFlattenFunctions];

	const cases = [
		arrayFlatMap,
		arrayReduce,
		emptyArrayConcat,
		arrayPrototypeConcat,
		{
			testFunction: node => isCallExpression(node, {
				argumentsLength: 1,
				optional: false,
			}) && isNodeMatches(node.callee, functions),
			getArrayNode: node => node.arguments[0],
			description: node => `${functions.find(nameOrPath => isNodeMatchesNameOrPath(node.callee, nameOrPath)).trim()}()`,
		},
	];

	context.on('CallExpression', function * (node) {
		for (const {testFunction, description, getArrayNode, shouldSwitchToArray, isOptionalArray} of cases) {
			if (!testFunction(node, context)) {
				continue;
			}

			const array = getArrayNode(node);
			const optional = isOptionalArray?.(node);

			const data = {
				description: typeof description === 'string' ? description : description(node),
			};

			const problem = {
				node,
				messageId: MESSAGE_ID,
				data,
			};

			const {sourceCode} = context;

			// Don't fix if it has comments.
			if (
				sourceCode.getCommentsInside(node).length
				=== sourceCode.getCommentsInside(array).length
			) {
				problem.fix = fix(node, array, context, shouldSwitchToArray, optional);
			}

			yield problem;
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
			description: 'Prefer `Array#flat()` over legacy techniques to flatten arrays.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{functions: []}],
		messages,
	},
};

export default config;
