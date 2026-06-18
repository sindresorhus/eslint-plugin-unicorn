import {
	isFunction,
	isMethodCall,
	isNegativeOne,
	isNumericLiteral,
} from './ast/index.js';
import {
	hasOptionalChainElement,
	isKnownNonArray,
	isLeftHandSide,
	isSameReference,
	isStrongPrecedenceNode,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-array-sort-for-min-max/error';
const MESSAGE_ID_SUGGESTION = 'no-array-sort-for-min-max/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Use `Math.{{method}}()` instead of sorting to get the {{extreme}} value.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

const isZero = node => isNumericLiteral(node) && node.value === 0;

const isLoopLeftHandSide = node =>
	(
		node.parent.type === 'ForInStatement'
		|| node.parent.type === 'ForOfStatement'
	)
	&& node.parent.left === node;

const getFunctionBodyExpression = node => {
	if (node.body.type !== 'BlockStatement') {
		return node.body;
	}

	if (node.body.body.length !== 1) {
		return;
	}

	const [statement] = node.body.body;
	if (statement.type === 'ReturnStatement') {
		return statement.argument;
	}
};

const getSortDirection = comparator => {
	if (
		!isFunction(comparator)
		|| comparator.async
		|| comparator.generator
		|| comparator.params.length !== 2
		|| comparator.params.some(parameter => parameter.type !== 'Identifier')
	) {
		return;
	}

	const body = unwrapTypeScriptExpression(getFunctionBodyExpression(comparator));
	if (body?.type !== 'BinaryExpression' || body.operator !== '-') {
		return;
	}

	const [firstParameter, secondParameter] = comparator.params;
	if (firstParameter.name === secondParameter.name) {
		return;
	}

	if (isSameReference(body.left, firstParameter) && isSameReference(body.right, secondParameter)) {
		return 'ascending';
	}

	if (isSameReference(body.left, secondParameter) && isSameReference(body.right, firstParameter)) {
		return 'descending';
	}
};

const getSortedSource = (callExpression, context) => {
	if (!isMethodCall(callExpression, {
		methods: ['sort', 'toSorted'],
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	if (isKnownNonArray(callExpression.callee.object, context)) {
		return;
	}

	if (hasOptionalChainElement(callExpression.callee.object)) {
		return;
	}

	const [comparator] = callExpression.arguments;
	const direction = getSortDirection(comparator);
	if (!direction) {
		return;
	}

	return {
		direction,
		node: callExpression.callee.object,
	};
};

const getMethod = (direction, endpoint) => {
	if (endpoint === 'first') {
		return direction === 'ascending' ? 'min' : 'max';
	}

	return direction === 'ascending' ? 'max' : 'min';
};

const getReplacement = (method, sourceNode, sourceCode) => {
	const sourceText = isStrongPrecedenceNode(sourceNode)
		? sourceCode.getText(sourceNode)
		: `(${sourceCode.getText(sourceNode)})`;

	return `Math.${method}(...${sourceText})`;
};

const createProblem = (node, sortedSource, endpoint, context) => {
	const method = getMethod(sortedSource.direction, endpoint);
	const problem = {
		node,
		messageId: MESSAGE_ID_ERROR,
		data: {
			method,
			extreme: method === 'min' ? 'minimum' : 'maximum',
		},
	};

	if (
		sortedSource.node.type !== 'Super'
		&& context.sourceCode.getCommentsInside(node).length === 0
	) {
		const replacement = getReplacement(method, sortedSource.node, context.sourceCode);

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				data: {replacement},
				fix: fixer => fixer.replaceText(node, replacement),
			},
		];
	}

	return problem;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', memberExpression => {
		if (
			!memberExpression.computed
			|| memberExpression.optional
			|| !isZero(memberExpression.property)
			|| isLeftHandSide(memberExpression)
			|| isLoopLeftHandSide(memberExpression)
		) {
			return;
		}

		const sortedSource = getSortedSource(memberExpression.object, context);
		if (!sortedSource) {
			return;
		}

		return createProblem(memberExpression, sortedSource, 'first', context);
	});

	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'at',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [index] = callExpression.arguments;
		let endpoint;
		if (isZero(index)) {
			endpoint = 'first';
		} else if (isNegativeOne(index)) {
			endpoint = 'last';
		}

		if (!endpoint) {
			return;
		}

		if (isLeftHandSide(callExpression)) {
			return;
		}

		const sortedSource = getSortedSource(callExpression.callee.object, context);
		if (!sortedSource) {
			return;
		}

		return createProblem(callExpression, sortedSource, endpoint, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow sorting arrays to get the minimum or maximum value.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
