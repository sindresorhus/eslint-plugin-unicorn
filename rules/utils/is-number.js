'use strict';
const {getStaticValue} = require('eslint-utils');

const isStaticProperties = (node, object, properties) =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& !node.optional
	&& node.object.type === 'Identifier'
	&& node.object.name === object
	&& node.property.type === 'Identifier'
	&& properties.has(node.property.name);
const isFunctionCall = (node, functionName) => node.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& node.callee.name === functionName;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math#static_properties
const mathProperties = new Set([
	'E',
	'LN2',
	'LN10',
	'LOG2E',
	'LOG10E',
	'PI',
	'SQRT1_2',
	'SQRT2',
]);

// `Math.{E,LN2,LN10,LOG2E,LOG10E,PI,SQRT1_2,SQRT2}`
const isMathProperty = node => isStaticProperties(node, 'Math', mathProperties);

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math#static_methods
const mathMethods = new Set([
	'abs',
	'acos',
	'acosh',
	'asin',
	'asinh',
	'atan',
	'atanh',
	'atan2',
	'cbrt',
	'ceil',
	'clz32',
	'cos',
	'cosh',
	'exp',
	'expm1',
	'floor',
	'fround',
	'hypot',
	'imul',
	'log',
	'log1p',
	'log10',
	'log2',
	'max',
	'min',
	'pow',
	'random',
	'round',
	'sign',
	'sin',
	'sinh',
	'sqrt',
	'tan',
	'tanh',
	'trunc',
]);
// `Math.{abs, …, trunc}(…)`
const isMathMethodCall = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isStaticProperties(node.callee, 'Math', mathMethods);

// `Number(…)`
const isNumberCall = node => isFunctionCall(node, 'Number');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number#static_properties
const numberProperties = new Set([
	'EPSILON',
	'MAX_SAFE_INTEGER',
	'MAX_VALUE',
	'MIN_SAFE_INTEGER',
	'MIN_VALUE',
	// We don't consider `Number.NaN` as number
	// 'NaN',
	'NEGATIVE_INFINITY',
	'POSITIVE_INFINITY',
]);
const isNumberProperty = node => isStaticProperties(node, 'Number', numberProperties);

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number#static_methods
const numberMethods = new Set([
	'parseFloat',
	'parseInt',
]);
const isNumberMethodCall = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isStaticProperties(node.callee, 'Number', numberMethods);
const isGlobalParseToNumberFunctionCall = node => isFunctionCall(node, 'parseInt') || isFunctionCall(node, 'parseFloat');

// `+x`, `-x`
const numberUnaryOperators = new Set(['-', '+', '~']);
const isNumberUnaryExpression = node =>
	node.type === 'UnaryExpression'
	&& node.prefix
	&& numberUnaryOperators.has(node.operator);

const isStaticNumber = (node, scope) => {
	const staticResult = getStaticValue(node, scope);
	return staticResult !== null && typeof staticResult.value === 'number';
};

const isNumberLiteral = node => node.type === 'Literal' && typeof node.value === 'number';
const isLengthProperty = node =>
	node.type === 'MemberExpression'
	&& !node.computed
	&& !node.optional
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length';


const mathOperators = new Set(['-', '*', '/', '%', '**', '<<', '>>', '>>>', '|', '^', '&']);
function isNumber(node, scope) {
	if (
		isNumberLiteral(node)
		|| isMathProperty(node)
		|| isMathMethodCall(node)
		|| isNumberCall(node)
		|| isNumberProperty(node)
		|| isNumberMethodCall(node)
		|| isGlobalParseToNumberFunctionCall(node)
		|| isNumberUnaryExpression(node)
		|| isLengthProperty(node)
	) {
		return true;
	}

	switch (node.type) {
		case 'BinaryExpression':
		case 'AssignmentExpression': {
			let {operator} = node;

			if (node.type === 'AssignmentExpression') {
				operator = operator.slice(0, -1);
			}

			if (operator === '+') {
				return isNumber(node.left, scope) && isNumber(node.right, scope);
			}

			// `a + b` can be `BigInt`, we need make sure at least one side is number
			if (mathOperators.has(operator)) {
				return isNumber(node.left, scope) || isNumber(node.right, scope);
			}

			break;
		}

		case 'ConditionalExpression':
			return isNumber(node.consequent, scope) && isNumber(node.alternate, scope);
		case 'SequenceExpression':
			return isNumber(node.expressions[node.expressions.length - 1], scope);
		// No default
	}

	return isStaticNumber(node, scope);
}

module.exports = isNumber;
