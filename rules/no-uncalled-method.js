import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	isArray,
	isLeftHandSide,
	isString,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-uncalled-method';
const messages = {
	[MESSAGE_ID]: 'Call `{{method}}()` instead of referencing the method.',
};

const arrayMethods = new Set([
	'at',
	'concat',
	'copyWithin',
	'entries',
	'every',
	'fill',
	'filter',
	'find',
	'findIndex',
	'findLast',
	'findLastIndex',
	'flat',
	'flatMap',
	'forEach',
	'includes',
	'indexOf',
	'join',
	'keys',
	'lastIndexOf',
	'map',
	'pop',
	'push',
	'reduce',
	'reduceRight',
	'reverse',
	'shift',
	'slice',
	'some',
	'sort',
	'splice',
	'toLocaleString',
	'toReversed',
	'toSorted',
	'toSpliced',
	'toString',
	'unshift',
	'values',
	'with',
]);

const stringMethods = new Set([
	'at',
	'anchor',
	'big',
	'blink',
	'charAt',
	'charCodeAt',
	'codePointAt',
	'concat',
	'endsWith',
	'fixed',
	'fontcolor',
	'fontsize',
	'includes',
	'indexOf',
	'isWellFormed',
	'italics',
	'lastIndexOf',
	'link',
	'localeCompare',
	'match',
	'matchAll',
	'normalize',
	'padEnd',
	'padStart',
	'repeat',
	'replace',
	'replaceAll',
	'search',
	'slice',
	'small',
	'split',
	'startsWith',
	'strike',
	'sub',
	'substr',
	'substring',
	'sup',
	'toLocaleLowerCase',
	'toLocaleUpperCase',
	'toLowerCase',
	'toString',
	'toUpperCase',
	'toWellFormed',
	'trim',
	'trimEnd',
	'trimLeft',
	'trimRight',
	'trimStart',
	'valueOf',
]);

const callableReferenceMethods = new Set([
	'apply',
	'bind',
	'call',
]);

const isIdentifierNamed = (node, name) =>
	node.type === 'Identifier'
	&& node.name === name;

const isTransparentExpressionWrapper = node =>
	node.type === 'ChainExpression'
	|| node.type === 'ParenthesizedExpression'
	|| node.type === 'TSInstantiationExpression'
	|| isTypeScriptExpressionWrapper(node);

const getOutermostExpression = node => {
	while (
		isTransparentExpressionWrapper(node.parent)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
};

function isNamedOrConstAlias(node, name, context, visitedVariables = new Set()) {
	node = unwrapTypeScriptExpression(node);

	if (isIdentifierNamed(node, name)) {
		return true;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return false;
	}

	visitedVariables.add(variable);

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
	) {
		return false;
	}

	return isNamedOrConstAlias(definition.node.init, name, context, visitedVariables);
}

const isArrayReceiver = (node, context) =>
	isNamedOrConstAlias(node, 'array', context) || isArray(node, context);

const isStringReceiver = (node, context) =>
	isNamedOrConstAlias(node, 'string', context) || isString(node, context);

const isPrototypeMethod = (node, context) => {
	if (node.object.type !== 'MemberExpression') {
		return false;
	}

	const property = getPropertyName(node.object, context.sourceCode.getScope(node.object));
	return property === 'prototype'
		&& (
			isIdentifierNamed(node.object.object, 'Array')
			|| isIdentifierNamed(node.object.object, 'String')
		);
};

const isCallee = node => {
	node = getOutermostExpression(node);

	return (
		(
			node.parent.type === 'CallExpression'
			|| node.parent.type === 'NewExpression'
		)
		&& node.parent.callee === node
	);
};

const isCallableReference = (node, context) => {
	node = getOutermostExpression(node);

	if (node.parent.type !== 'MemberExpression' || node.parent.object !== node) {
		return false;
	}

	const method = getPropertyName(node.parent, context.sourceCode.getScope(node.parent));
	if (!callableReferenceMethods.has(method)) {
		return false;
	}

	return isCallee(node.parent);
};

const isReflectApplyArgument = node => {
	const argument = getOutermostExpression(node);
	return argument.parent.type === 'CallExpression'
		&& argument.parent.arguments[0] === argument
		&& isMethodCall(argument.parent, {
			object: 'Reflect',
			method: 'apply',
		});
};

const isTypeofArgument = node => {
	node = getOutermostExpression(node);

	return (
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'typeof'
	);
};

const shouldSkip = (node, context) =>
	isCallee(node)
	|| isCallableReference(node, context)
	|| isReflectApplyArgument(node)
	|| isTypeofArgument(node)
	|| isLeftHandSide(getOutermostExpression(node))
	|| isPrototypeMethod(node, context);

function shouldReport({receiver, method, context}) {
	if (
		arrayMethods.has(method)
		&& isArrayReceiver(receiver, context)
	) {
		return true;
	}

	return Boolean(stringMethods.has(method)
		&& isStringReceiver(receiver, context));
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		if (shouldSkip(node, context)) {
			return;
		}

		const method = getPropertyName(node, sourceCode.getScope(node));
		if (!method) {
			return;
		}

		if (!shouldReport({
			receiver: node.object,
			method,
			context,
		})) {
			return;
		}

		return {
			node: node.property,
			messageId: MESSAGE_ID,
			data: {method},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow referencing methods without calling them.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
