import {
	getPropertyName,
	getStaticValue,
	hasSideEffect,
	isCommentToken,
} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isNewExpression,
} from './ast/index.js';
import {
	getArgumentRemovalRange,
	removeArgument,
	removeObjectProperty,
} from './fix/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isGlobalIdentifier,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_EMPTY_OPTIONS = 'empty-options';
const MESSAGE_ID_PROPERTY = 'property';

const messages = {
	[MESSAGE_ID_EMPTY_OPTIONS]: 'Remove unnecessary empty fetch options.',
	[MESSAGE_ID_PROPERTY]: 'Remove unnecessary `{{property}}` fetch option.',
};

const requestInitProperties = new Set([
	'attributionReporting',
	'body',
	'browsingTopics',
	'cache',
	'credentials',
	'duplex',
	'headers',
	'integrity',
	'keepalive',
	'method',
	'mode',
	'priority',
	'redirect',
	'referrer',
	'referrerPolicy',
	'signal',
	'window',
]);

const defaultValues = new Map([
	['cache', 'default'],
	['credentials', 'same-origin'],
	['integrity', ''],
	['keepalive', false],
	['method', 'GET'],
	['mode', 'cors'],
	['redirect', 'follow'],
	['referrer', 'about:client'],
	['referrerPolicy', ''],
]);

const request = 'request';
const nonRequest = 'non-request';
const unknown = 'unknown';

const isGlobalIdentifierNamed = (node, name, context) =>
	node.type === 'Identifier'
	&& node.name === name
	&& isGlobalIdentifier(node, context);

const isStaticStringLiteral = node =>
	node.type === 'Literal'
	&& typeof node.value === 'string';

const getStaticPropertyName = (property, context) =>
	property.type === 'Property'
		? getPropertyName(property, context.sourceCode.getScope(property)) ?? undefined
		: undefined;

const getStaticValueForNode = (node, context) =>
	getStaticValue(unwrapTypeScriptExpression(node), context.sourceCode.getScope(node));

const hasCommentsInside = (node, context) =>
	context.sourceCode.getCommentsInside(node).length > 0;

const hasSideEffectValue = (node, context) =>
	hasSideEffect(unwrapTypeScriptExpression(node), context.sourceCode, {considerGetters: true});

const hasSideEffectProperty = (property, context) =>
	hasSideEffectValue(property.value, context)
	|| (
		property.computed
		&& hasSideEffectValue(property.key, context)
	);

const hasCommentsInRange = (range, context) => {
	const {sourceCode} = context;

	return sourceCode.getAllComments().some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return commentRange[0] >= range[0] && commentRange[1] <= range[1];
	});
};

const canRemoveArgumentWithoutComments = (node, context) =>
	!hasCommentsInRange(getArgumentRemovalRange(node, context), context)
	&& !isCommentToken(context.sourceCode.getTokenAfter(node, {includeComments: true}));

const isStaticUndefined = (node, context) => {
	const result = getStaticValueForNode(node, context);
	return result ? result.value === undefined : false;
};

const isStaticNull = (node, context) =>
	getStaticValueForNode(node, context)?.value === null;

const isEmptyHeaders = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (node.type === 'ObjectExpression') {
		return node.properties.length === 0;
	}

	if (node.type === 'ArrayExpression') {
		return node.elements.length === 0;
	}

	return isNewExpression(node, {
		name: 'Headers',
		argumentsLength: 0,
	})
	&& isGlobalIdentifierNamed(node.callee, 'Headers', context);
};

function getObjectPropertyNames(properties, context) {
	const names = [];
	const seen = new Set();

	for (const property of properties) {
		const name = getStaticPropertyName(property, context);
		if (!name || seen.has(name)) {
			return;
		}

		seen.add(name);
		names.push(name);
	}

	return names;
}

const getTypeName = (type, program) => {
	const symbol = getTypeSymbol(type);
	return isDefaultLibrarySymbol(symbol, program) ? symbol.getName() : undefined;
};

function combineTypeStates(states) {
	if (states.includes(request)) {
		return request;
	}

	if (states.length > 0 && states.every(state => state === nonRequest)) {
		return nonRequest;
	}

	return unknown;
}

function getInputTypeState(type, checker, program, seen = new Set()) {
	type = checker.getNonNullableType(type);

	if (seen.has(type)) {
		return unknown;
	}

	seen.add(type);

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint) {
		return getInputTypeState(constraint, checker, program, seen);
	}

	if (type.isUnion()) {
		return combineTypeStates(type.types.map(type => getInputTypeState(type, checker, program, seen)));
	}

	if (type.isIntersection()) {
		return combineTypeStates(type.types.map(type => getInputTypeState(type, checker, program, seen)));
	}

	if (checker.typeToString(type) === 'string' || type.isStringLiteral?.()) {
		return nonRequest;
	}

	const typeName = getTypeName(type, program) ?? checker.typeToString(type);
	if (typeName === 'Request') {
		return request;
	}

	if (typeName === 'URL' || typeName === 'String') {
		return nonRequest;
	}

	return combineTypeStates(getBaseTypes(type, checker).map(type => getInputTypeState(type, checker, program, seen)));
}

function getInputState(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (
		isStaticStringLiteral(node)
		|| (
			node.type === 'TemplateLiteral'
			&& node.expressions.length === 0
		)
		|| (
			isNewExpression(node, {
				name: 'URL',
				minimumArguments: 1,
			})
			&& isGlobalIdentifierNamed(node.callee, 'URL', context)
		)
	) {
		return nonRequest;
	}

	if (
		isNewExpression(node, {
			name: 'Request',
			minimumArguments: 1,
		})
		&& isGlobalIdentifierNamed(node.callee, 'Request', context)
	) {
		return request;
	}

	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	return getInputTypeState(
		parserServices.getTypeAtLocation(node),
		parserServices.program.getTypeChecker(),
		parserServices.program,
	);
}

const isDefaultValue = (propertyName, value, context) => {
	if (!defaultValues.has(propertyName)) {
		return false;
	}

	const staticValue = getStaticValueForNode(value, context)?.value;
	const defaultValue = defaultValues.get(propertyName);

	return propertyName === 'method' && typeof staticValue === 'string'
		? staticValue.toUpperCase() === defaultValue
		: staticValue === defaultValue;
};

function isUnnecessaryProperty(property, propertyName, inputState, context) {
	if (
		requestInitProperties.has(propertyName)
		&& isStaticUndefined(property.value, context)
	) {
		return true;
	}

	if (
		propertyName === 'body'
		&& isStaticNull(property.value, context)
	) {
		return true;
	}

	if (inputState !== nonRequest) {
		return false;
	}

	if (
		propertyName === 'headers'
		&& isEmptyHeaders(property.value, context)
	) {
		return true;
	}

	return isDefaultValue(propertyName, property.value, context);
}

const getFix = (property, optionsNode, context) => function * (fixer, {abort}) {
	if (
		hasCommentsInside(optionsNode, context)
		|| hasSideEffectProperty(property, context)
	) {
		return abort();
	}

	if (
		optionsNode.properties.length === 1
		&& optionsNode.parent.arguments.at(-1) === optionsNode
	) {
		if (!canRemoveArgumentWithoutComments(optionsNode, context)) {
			return abort();
		}

		yield removeArgument(fixer, optionsNode, context);
		return;
	}

	yield removeObjectProperty(fixer, property, context);
};

function * getOptionsProblems(input, optionsNode, context) {
	if (optionsNode.type !== 'ObjectExpression') {
		return;
	}

	const {properties} = optionsNode;

	if (properties.length === 0) {
		if (optionsNode.parent.arguments.at(-1) !== optionsNode) {
			return;
		}

		yield {
			node: optionsNode,
			messageId: MESSAGE_ID_EMPTY_OPTIONS,
			fix: canRemoveArgumentWithoutComments(optionsNode, context)
				? fixer => removeArgument(fixer, optionsNode, context)
				: undefined,
		};
		return;
	}

	const propertyNames = getObjectPropertyNames(properties, context);
	if (!propertyNames) {
		return;
	}

	const inputState = getInputState(input, context);

	for (const [index, property] of properties.entries()) {
		const propertyName = propertyNames[index];
		if (!isUnnecessaryProperty(property, propertyName, inputState, context)) {
			continue;
		}

		yield {
			node: property.key,
			messageId: MESSAGE_ID_PROPERTY,
			data: {property: propertyName},
			fix: getFix(property, optionsNode, context),
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', function * (callExpression) {
		if (
			!isCallExpression(callExpression, {
				name: 'fetch',
				minimumArguments: 2,
				optional: false,
			})
			|| !isGlobalIdentifierNamed(callExpression.callee, 'fetch', context)
		) {
			return;
		}

		yield * getOptionsProblems(callExpression.arguments[0], callExpression.arguments[1], context);
	});

	context.on('NewExpression', function * (newExpression) {
		if (
			!isNewExpression(newExpression, {
				name: 'Request',
				minimumArguments: 2,
			})
			|| !isGlobalIdentifierNamed(newExpression.callee, 'Request', context)
		) {
			return;
		}

		yield * getOptionsProblems(newExpression.arguments[0], newExpression.arguments[1], context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary options in `fetch()` and `new Request()`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
