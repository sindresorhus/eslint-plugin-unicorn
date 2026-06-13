import {isFunction, isMethodCall, isNumericLiteral} from './ast/index.js';
import {isSameReference} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'prefer-simple-sort-comparator/error';
const MESSAGE_ID_SUGGESTION = 'prefer-simple-sort-comparator/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer a simple comparison function for `Array#sort()`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

const relationalOperators = new Set(['>', '<', '>=', '<=']);

/** Check whether a node is a numeric literal, optionally with a unary `+`/`-` sign. */
const isSignedNumericLiteral = node =>
	isNumericLiteral(node)
	|| (
		node.type === 'UnaryExpression'
		&& (node.operator === '-' || node.operator === '+')
		&& isNumericLiteral(node.argument)
	);

/**
Check whether `left` and `right` are mirror images of each other under swapping the two parameters,
e.g. `a` and `b`, `a.foo` and `b.foo`, `a[0]` and `b[0]`.
*/
const isParameterSwap = (left, right, firstParameter, secondParameter) => {
	if (left.type === 'Identifier' && right.type === 'Identifier') {
		return (
			(left.name === firstParameter.name && right.name === secondParameter.name)
			|| (left.name === secondParameter.name && right.name === firstParameter.name)
		);
	}

	if (left.type === 'MemberExpression' && right.type === 'MemberExpression') {
		return (
			left.computed === right.computed
			&& (
				left.computed
					? isSameReference(left.property, right.property)
					: left.property.name === right.property.name
			)
			&& isParameterSwap(left.object, right.object, firstParameter, secondParameter)
		);
	}

	return false;
};

const toStatements = node => node.type === 'BlockStatement' ? node.body : [node];

/*
Reduce a comparator body to a tree of `{test, consequent, alternate}` branches and numeric leaves,
or `undefined` if it is not a pure sign-producing comparison.
*/
function analyzeExpression(node) {
	if (isSignedNumericLiteral(node)) {
		return {type: 'leaf', node};
	}

	if (node.type === 'ConditionalExpression') {
		const consequent = analyzeExpression(node.consequent);
		const alternate = analyzeExpression(node.alternate);
		if (consequent && alternate) {
			return {
				type: 'branch', test: node.test, consequent, alternate,
			};
		}
	}
}

function analyzeStatements(statements) {
	const [first, ...rest] = statements;

	if (first?.type === 'ReturnStatement') {
		return first.argument ? analyzeExpression(first.argument) : undefined;
	}

	if (first?.type === 'IfStatement') {
		const consequent = analyzeStatements(toStatements(first.consequent));
		const alternate = first.alternate
			? analyzeStatements(toStatements(first.alternate))
			: analyzeStatements(rest);
		if (consequent && alternate) {
			return {
				type: 'branch', test: first.test, consequent, alternate,
			};
		}
	}
}

const analyzeBody = body =>
	body.type === 'BlockStatement'
		? analyzeStatements(body.body)
		: analyzeExpression(body);

/** Collect every relational test in the comparison tree. */
function collectTests(branch, tests = []) {
	if (branch.type === 'branch') {
		tests.push(branch.test);
		collectTests(branch.consequent, tests);
		collectTests(branch.alternate, tests);
	}

	return tests;
}

/** Collect every returned numeric-literal leaf in the comparison tree. */
function collectLeaves(branch, leaves = []) {
	if (branch.type === 'leaf') {
		leaves.push(branch.node);
	} else {
		collectLeaves(branch.consequent, leaves);
		collectLeaves(branch.alternate, leaves);
	}

	return leaves;
}

/** The sign of a numeric-literal leaf node, e.g. `1` → `1`, `-2` → `-1`, `0` → `0`. */
function leafSign(node) {
	const value = node.type === 'UnaryExpression'
		? (node.operator === '-' ? -node.argument.value : node.argument.value)
		: node.value;
	return Math.sign(value);
}

/** The sign returned when the outermost test is true (descends consequents). */
function trueBranchSign(branch) {
	while (branch.type === 'branch') {
		branch = branch.consequent;
	}

	return leafSign(branch.node);
}

function expectedSignForTest(test, minuend, subtrahend) {
	const greaterThan = test.operator === '>' || test.operator === '>=';
	const testLeftIsMinuend = isSameReference(test.left, minuend) && isSameReference(test.right, subtrahend);

	if (testLeftIsMinuend) {
		return greaterThan ? 1 : -1;
	}

	return greaterThan ? -1 : 1;
}

function branchSignsMatchSubtraction(branch, minuend, subtrahend) {
	if (branch.type === 'leaf') {
		return true;
	}

	const expectedSign = expectedSignForTest(branch.test, minuend, subtrahend);

	return (
		trueBranchSign(branch) === expectedSign
		&& branchSignsMatchSubtraction(branch.consequent, minuend, subtrahend)
		&& branchSignsMatchSubtraction(branch.alternate, minuend, subtrahend)
	);
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['sort', 'toSorted'],
			argumentsLength: 1,
		})) {
			return;
		}

		const [comparator] = callExpression.arguments;

		if (
			!isFunction(comparator)
			|| comparator.async
			|| comparator.generator
			|| comparator.params.length !== 2
			|| comparator.params.some(parameter => parameter.type !== 'Identifier')
		) {
			return;
		}

		const tree = analyzeBody(comparator.body);
		if (tree?.type !== 'branch') {
			return;
		}

		const [firstParameter, secondParameter] = comparator.params;
		const tests = collectTests(tree);

		if (tests.some(test =>
			test.type !== 'BinaryExpression'
			|| !relationalOperators.has(test.operator)
			|| !isParameterSwap(test.left, test.right, firstParameter, secondParameter))) {
			return;
		}

		// All tests must compare the same operand pair, otherwise it is a multi-key comparator.
		const [{left, right}] = tests;
		const sameOperandPair = tests.every(test =>
			(isSameReference(test.left, left) && isSameReference(test.right, right))
			|| (isSameReference(test.left, right) && isSameReference(test.right, left)));
		if (!sameOperandPair) {
			return;
		}

		// Only a genuine bidirectional comparator (returns both a positive and a negative
		// value) with a determinate direction is equivalent to a subtraction.
		const signs = collectLeaves(tree).map(node => leafSign(node));
		const sign = trueBranchSign(tree);
		if (signs.every(value => value <= 0) || signs.every(value => value >= 0) || sign === 0) {
			return;
		}

		// Orient the subtraction so it matches the comparator's sort direction.
		const {test} = tree;
		const greaterThan = test.operator === '>' || test.operator === '>=';
		const leftIsMinuend = greaterThan ? sign > 0 : sign < 0;
		const [minuend, subtrahend] = leftIsMinuend ? [test.left, test.right] : [test.right, test.left];

		if (!branchSignsMatchSubtraction(tree, minuend, subtrahend)) {
			return;
		}

		const replacement = `(${firstParameter.name}, ${secondParameter.name}) => ${sourceCode.getText(minuend)} - ${sourceCode.getText(subtrahend)}`;

		const problem = {
			node: comparator,
			messageId: MESSAGE_ID_ERROR,
		};

		// Replacing the whole function would drop any comments inside it, so only suggest when there are none.
		if (sourceCode.getCommentsInside(comparator).length === 0) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {replacement},
					fix: fixer => fixer.replaceText(comparator, replacement),
				},
			];
		}

		return problem;
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer a simple comparison function for `Array#sort()`.',
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
