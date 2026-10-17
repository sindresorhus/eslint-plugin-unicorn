import {
	getParenthesizedText,
	getParenthesizedRange,
	getConstVariableInitializer,
	getOutermostTypeScriptExpression,
	getPrimitiveLiteralValue,
	hasCommentInRange,
	isSameReference,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';
import {isLiteral, isMemberExpression, isMethodCall} from './ast/index.js';
import {replaceNodeOrTokenAndSpacesBefore, removeParentheses} from './fix/index.js';

const MESSAGE_ID = 'prefer-modern-math-apis';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{description}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

function getStaticNumber(node, context) {
	node = unwrapTypeScriptExpression(node);
	node = unwrapTypeScriptExpression(getConstVariableInitializer(node, context) ?? node);
	const argument = node.type === 'UnaryExpression' && (node.operator === '+' || node.operator === '-')
		? unwrapTypeScriptExpression(node.argument)
		: node;
	let value;
	if (argument.type === 'Identifier' && ['Infinity', 'NaN', 'undefined'].includes(argument.name)) {
		value = argument.name === 'Infinity' ? Infinity : NaN;
	} else if (isMemberExpression(argument, {
		object: 'Number',
		properties: [
			'EPSILON',
			'MAX_SAFE_INTEGER',
			'MAX_VALUE',
			'MIN_SAFE_INTEGER',
			'MIN_VALUE',
			'NEGATIVE_INFINITY',
			'NaN',
			'POSITIVE_INFINITY',
		],
		optional: false,
		computed: false,
	})) {
		value = Number[argument.property.name];
	} else if (isMemberExpression(argument, {
		object: 'Math',
		properties: [
			'E',
			'LN10',
			'LN2',
			'LOG10E',
			'LOG2E',
			'PI',
			'SQRT1_2',
			'SQRT2',
		],
		optional: false,
		computed: false,
	})) {
		value = Math[argument.property.name];
	} else {
		const literalValue = getPrimitiveLiteralValue(node);
		return literalValue === undefined || typeof literalValue === 'bigint' ? undefined : Number(literalValue);
	}

	return node.type === 'UnaryExpression' && node.operator === '-' ? -value : value;
}

function isNumericValueUnused(node) {
	// Expression statement completion values can be observed by `eval()`.
	while (true) {
		const expression = getOutermostTypeScriptExpression(node);
		node = expression.parent;
		switch (node.type) {
			case 'UnaryExpression': {
				return ['void', 'typeof', 'delete'].includes(node.operator);
			}

			case 'ForStatement': {
				return node.init === expression || node.update === expression;
			}

			case 'SequenceExpression': {
				if (node.expressions.at(-1) !== expression) {
					return true;
				}

				continue;
			}

			case 'ConditionalExpression': {
				if (node.test === expression) {
					return false;
				}

				continue;
			}

			case 'LogicalExpression': {
				if (node.left === expression) {
					return false;
				}

				continue;
			}

			default: {
				return false;
			}
		}
	}
}

function canAutoFixLogCall(node, valueNode, context) {
	if (isNumericValueUnused(node)) {
		return true;
	}

	const value = getStaticNumber(valueNode, context);
	// These inputs have specified exact results for every logarithm base.
	return value !== undefined && (value <= 0 || value === 1 || !Number.isFinite(value));
}

function getProblemWithFix(problem, fix, canAutoFix) {
	if (!fix) {
		return problem;
	}

	if (canAutoFix) {
		problem.fix = fix;
	} else {
		problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, fix}];
	}

	return problem;
}

const isMathProperty = (node, property) => isMemberExpression(node, {
	object: 'Math',
	property,
	optional: false,
});

const isMathMethodCall = (node, method) => isMethodCall(node, {
	object: 'Math',
	method,
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
});

// `Math.log(x) * Math.LOG10E` -> `Math.log10(x)`
// `Math.LOG10E * Math.log(x)` -> `Math.log10(x)`
// `Math.log(x) * Math.LOG2E` -> `Math.log2(x)`
// `Math.LOG2E * Math.log(x)` -> `Math.log2(x)`
function createLogCallTimesConstantCheck({constantName, replacementMethod}) {
	const replacement = `Math.${replacementMethod}(…)`;

	return function (node, context) {
		if (!(node.type === 'BinaryExpression' && node.operator === '*')) {
			return;
		}

		let mathLogCall;
		let description;
		if (isMathMethodCall(node.left, 'log') && isMathProperty(node.right, constantName)) {
			mathLogCall = node.left;
			description = `Math.log(…) * Math.${constantName}`;
		} else if (isMathMethodCall(node.right, 'log') && isMathProperty(node.left, constantName)) {
			mathLogCall = node.right;
			description = `Math.${constantName} * Math.log(…)`;
		}

		if (!mathLogCall) {
			return;
		}

		const [valueNode] = mathLogCall.arguments;
		// The replacement is built from the argument alone, so a comment elsewhere in the expression would be lost
		const fix = wouldRemoveComments(context, node, [getParenthesizedRange(valueNode, context)])
			? undefined
			: fixer => fixer.replaceText(node, `Math.${replacementMethod}(${getParenthesizedText(valueNode, context)})`);

		return getProblemWithFix({
			node,
			messageId: MESSAGE_ID,
			data: {
				replacement,
				description,
			},
		}, fix, canAutoFixLogCall(node, valueNode, context));
	};
}

// `Math.log(x) / Math.LN10` -> `Math.log10(x)`
// `Math.log(x) / Math.LN2` -> `Math.log2(x)`
function createLogCallDivideConstantCheck({constantName, replacementMethod}) {
	const message = {
		messageId: MESSAGE_ID,
		data: {
			replacement: `Math.${replacementMethod}(…)`,
			description: `Math.log(…) / Math.${constantName}`,
		},
	};

	return function (node, context) {
		if (
			!(
				node.type === 'BinaryExpression'
				&& node.operator === '/'
				&& isMathMethodCall(node.left, 'log')
				&& isMathProperty(node.right, constantName)
			)
		) {
			return;
		}

		const [valueNode] = node.left.arguments;
		// The replacement is built from the argument alone, so a comment elsewhere in the expression would be lost
		const fix = wouldRemoveComments(context, node, [getParenthesizedRange(valueNode, context)])
			? undefined
			: fixer => fixer.replaceText(node, `Math.${replacementMethod}(${getParenthesizedText(valueNode, context)})`);

		return getProblemWithFix({
			...message,
			node,
		}, fix, canAutoFixLogCall(node, valueNode, context));
	};
}

const checkFunctions = [
	createLogCallTimesConstantCheck({constantName: 'LOG10E', replacementMethod: 'log10'}),
	createLogCallTimesConstantCheck({constantName: 'LOG2E', replacementMethod: 'log2'}),
	createLogCallDivideConstantCheck({constantName: 'LN10', replacementMethod: 'log10'}),
	createLogCallDivideConstantCheck({constantName: 'LN2', replacementMethod: 'log2'}),
];

const isPlusExpression = node => node.type === 'BinaryExpression' && node.operator === '+';

const isPow2Expression = node =>
	node.type === 'BinaryExpression'
	&& (
		// `x * x`
		(node.operator === '*' && isSameReference(node.left, node.right))
		// `x ** 2`
		|| (node.operator === '**' && isLiteral(node.right, 2))
	);

function flatPlusExpression(node, plusExpressions) {
	if (!isPlusExpression(node)) {
		return [node];
	}

	// A sum can contain sums on both sides, so collect every addition, including those without a square child.
	plusExpressions.push(node);
	return [node.left, node.right].flatMap(child => flatPlusExpression(child, plusExpressions));
}

function canAutoFixSquareExpressions(node, expressions, context) {
	const values = expressions.map(expression => getStaticNumber(expression.left, context));
	if (values.includes(undefined)) {
		return false;
	}

	if (isNumericValueUnused(node)) {
		return true;
	}

	if (values.length > 1) {
		const hasInfinity = values.includes(Infinity) || values.includes(-Infinity);
		if (hasInfinity) {
			return values.every(value => !Number.isNaN(value));
		}

		return values.every(value => value === 0)
			|| values.some(value => Number.isNaN(value));
	}

	const [value] = values;
	if (expressions[0].operator === '**') {
		return value === 0 || !Number.isFinite(value);
	}

	// Multiplication and square root have specified rounding; general exponentiation and `Math.hypot()` results do not.
	// eslint-disable-next-line unicorn/prefer-modern-math-apis -- Compare the original and replacement results.
	return Object.is(Math.sqrt(value * value), Math.abs(value));
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			object: 'Math',
			method: 'sqrt',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const plusExpressions = [];
		const expressions = flatPlusExpression(callExpression.arguments[0], plusExpressions);
		if (expressions.some(expression => !isPow2Expression(expression))) {
			return;
		}

		const replacementMethod = expressions.length === 1 ? 'abs' : 'hypot';
		const canAutoFix = canAutoFixSquareExpressions(callExpression, expressions, context);
		const fix = function * (fixer, {abort}) {
			const {sourceCode} = context;

			// `Math.sqrt` -> `Math.{hypot,abs}`
			yield fixer.replaceText(callExpression.callee.property, replacementMethod);

			// `a ** 2 + b ** 2` -> `a, b`
			for (const expression of plusExpressions) {
				const plusToken = sourceCode.getTokenAfter(expression.left, token => token.type === 'Punctuator' && token.value === '+');

				yield replaceNodeOrTokenAndSpacesBefore(plusToken, ',', fixer, context);
				yield removeParentheses(expression, fixer, context);
			}

			// `x ** 2` => `x`
			// `x * x` => `x`
			for (const expression of expressions) {
				// The removed range holds the operator and its right operand, so a comment there would be lost
				const [start, end] = [getParenthesizedRange(expression.left, context)[1], sourceCode.getRange(expression)[1]];
				if (hasCommentInRange(context, [start, end])) {
					return abort();
				}

				yield fixer.removeRange([start, end]);
			}
		};

		return getProblemWithFix({
			node: callExpression.callee.property,
			messageId: MESSAGE_ID,
			data: {
				replacement: `Math.${replacementMethod}(…)`,
				description: 'Math.sqrt(…)',
			},
		}, fix, canAutoFix);
	});

	context.on('BinaryExpression', function * (node) {
		for (const getProblem of checkFunctions) {
			const problem = getProblem(node, context);

			if (problem) {
				yield problem;
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer modern `Math` APIs over legacy patterns.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
