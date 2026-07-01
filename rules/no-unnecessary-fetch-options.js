import {
	findVariable,
	getPropertyName,
	getStaticValue,
	hasSideEffect,
	isCommaToken,
	isCommentToken,
} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isNewExpression,
	isReferenceIdentifier,
} from './ast/index.js';
import {
	getArgumentRemovalRange,
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

function hasReferenceDeclaredAfter(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (node.type.startsWith('TS')) {
		return false;
	}

	const {sourceCode} = context;
	if (isReferenceIdentifier(node)) {
		const variable = findVariable(sourceCode.getScope(node), node);
		const definition = variable?.defs[0]?.name;
		return definition
			? sourceCode.getRange(definition)[0] > sourceCode.getRange(node)[0]
			: false;
	}

	for (const key of sourceCode.visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			if (value.some(node => node && hasReferenceDeclaredAfter(node, context))) {
				return true;
			}

			continue;
		}

		if (value?.type && hasReferenceDeclaredAfter(value, context)) {
			return true;
		}
	}

	return false;
}

const isUnsafeToRemoveProperty = (property, context) =>
	hasSideEffectProperty(property, context)
	|| hasReferenceDeclaredAfter(property.value, context)
	|| (
		property.computed
		&& hasReferenceDeclaredAfter(property.key, context)
	);

const hasCommentsInRange = (range, context) => {
	const {sourceCode} = context;

	return sourceCode.getAllComments().some(comment => {
		const commentRange = sourceCode.getRange(comment);
		return commentRange[0] >= range[0] && commentRange[1] <= range[1];
	});
};

function getFinalArgumentRemovalRange(node, context) {
	const {sourceCode} = context;
	const range = getArgumentRemovalRange(node, context);
	const tokenAfter = sourceCode.getTokenAfter(node);

	if (isCommaToken(tokenAfter)) {
		range[1] = sourceCode.getRange(tokenAfter)[1];
	}

	return range;
}

function hasCommentAfterTrailingComma(node, context) {
	const {sourceCode} = context;
	const tokenAfter = sourceCode.getTokenAfter(node);
	return isCommaToken(tokenAfter)
		&& isCommentToken(sourceCode.getTokenAfter(tokenAfter, {includeComments: true}));
}

const canRemoveFinalArgumentWithoutComments = (node, context) =>
	!hasCommentsInRange(getFinalArgumentRemovalRange(node, context), context)
	&& !isCommentToken(context.sourceCode.getTokenAfter(node, {includeComments: true}))
	&& !hasCommentAfterTrailingComma(node, context);

const removeFinalArgument = (fixer, node, context) =>
	fixer.removeRange(getFinalArgumentRemovalRange(node, context));

function getPropertyLineRemovalRange(property, context) {
	const {sourceCode} = context;
	const location = sourceCode.getLoc(property);
	if (location.start.line !== location.end.line) {
		return;
	}

	const line = sourceCode.lines[location.start.line - 1];
	if (line.slice(0, location.start.column).trim() !== '') {
		return;
	}

	const tokenAfter = sourceCode.getTokenAfter(property);
	const tokenAfterLocation = sourceCode.getLoc(tokenAfter);
	const commaOnSameLine = isCommaToken(tokenAfter) && tokenAfterLocation.start.line === location.end.line;
	if (
		property.parent.properties.at(-1) !== property
		&& !commaOnSameLine
	) {
		return;
	}

	const endColumn = commaOnSameLine
		? tokenAfterLocation.end.column
		: location.end.column;
	if (line.slice(endColumn).trim() !== '') {
		return;
	}

	return [
		sourceCode.getIndexFromLoc({line: location.start.line, column: 0}),
		location.start.line < sourceCode.lines.length
			? sourceCode.getIndexFromLoc({line: location.start.line + 1, column: 0})
			: sourceCode.text.length,
	];
}

function getPropertyInlineRemovalRange(property, context) {
	const {sourceCode} = context;
	const location = sourceCode.getLoc(property);
	if (location.start.line !== location.end.line) {
		return;
	}

	const previousToken = sourceCode.getTokenBefore(property);
	const nextToken = sourceCode.getTokenAfter(property);
	const isLastProperty = property.parent.properties.at(-1) === property;

	if (isLastProperty) {
		if (!isCommaToken(previousToken)) {
			return;
		}

		const previousTokenLocation = sourceCode.getLoc(previousToken);
		if (previousTokenLocation.end.line !== location.start.line) {
			return;
		}

		const endToken = isCommaToken(nextToken)
			? sourceCode.getTokenAfter(nextToken)
			: nextToken;

		const end = endToken && sourceCode.getLoc(endToken).start.line === location.end.line
			? sourceCode.getRange(endToken)[0]
			: sourceCode.getRange(property)[1];

		return [
			sourceCode.getRange(previousToken)[0],
			end,
		];
	}

	if (!isCommaToken(nextToken)) {
		return;
	}

	const nextTokenLocation = sourceCode.getLoc(nextToken);
	if (nextTokenLocation.start.line !== location.end.line) {
		return;
	}

	const tokenAfterComma = sourceCode.getTokenAfter(nextToken);
	const end = tokenAfterComma && sourceCode.getLoc(tokenAfterComma).start.line === location.end.line
		? sourceCode.getRange(tokenAfterComma)[0]
		: sourceCode.getRange(nextToken)[1];

	return [
		sourceCode.getRange(property)[0],
		end,
	];
}

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
		if (name === undefined || seen.has(name)) {
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

	if (type.isUnion()) {
		return combineTypeStates(type.types.map(type => getInputTypeState(type, checker, program, seen)));
	}

	if (type.isIntersection()) {
		return combineTypeStates(type.types.map(type => getInputTypeState(type, checker, program, seen)));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint) {
		return getInputTypeState(constraint, checker, program, seen);
	}

	if (type.intrinsicName === 'string' || type.isStringLiteral?.()) {
		return nonRequest;
	}

	const typeName = getTypeName(type, program);
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

	try {
		return getInputTypeState(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
			parserServices.program,
		);
	} catch {
		return unknown;
	}
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

const getFix = (property, optionsNode, optionsArgument, context) => function * (fixer, {abort}) {
	if (
		hasCommentsInside(optionsNode, context)
		|| isUnsafeToRemoveProperty(property, context)
	) {
		return abort();
	}

	if (
		optionsNode.properties.length === 1
		&& optionsArgument.parent.arguments.at(-1) === optionsArgument
	) {
		if (!canRemoveFinalArgumentWithoutComments(optionsArgument, context)) {
			return abort();
		}

		yield removeFinalArgument(fixer, optionsArgument, context);
		return;
	}

	if (optionsNode.properties.length === 1) {
		yield fixer.replaceText(optionsNode, '{}');
		return;
	}

	const lineRemovalRange = getPropertyLineRemovalRange(property, context);
	if (lineRemovalRange) {
		yield fixer.removeRange(lineRemovalRange);
		return;
	}

	const inlineRemovalRange = getPropertyInlineRemovalRange(property, context);
	if (inlineRemovalRange) {
		yield fixer.removeRange(inlineRemovalRange);
		return;
	}

	yield removeObjectProperty(fixer, property, context);
};

function getWholeOptionsFix(unnecessaryProperties, optionsNode, optionsArgument, context) {
	if (
		unnecessaryProperties.length !== optionsNode.properties.length
		|| hasCommentsInside(optionsNode, context)
		|| unnecessaryProperties.some(({property}) => isUnsafeToRemoveProperty(property, context))
	) {
		return;
	}

	if (optionsArgument.parent.arguments.at(-1) !== optionsArgument) {
		return fixer => fixer.replaceText(optionsNode, '{}');
	}

	if (!canRemoveFinalArgumentWithoutComments(optionsArgument, context)) {
		return;
	}

	return fixer => removeFinalArgument(fixer, optionsArgument, context);
}

function * getOptionsProblems(input, optionsArgument, context) {
	const optionsNode = unwrapTypeScriptExpression(optionsArgument);

	if (optionsNode.type !== 'ObjectExpression') {
		return;
	}

	const {properties} = optionsNode;

	if (properties.length === 0) {
		if (optionsArgument.parent.arguments.at(-1) !== optionsArgument) {
			return;
		}

		yield {
			node: optionsNode,
			messageId: MESSAGE_ID_EMPTY_OPTIONS,
			fix: canRemoveFinalArgumentWithoutComments(optionsArgument, context)
				? fixer => removeFinalArgument(fixer, optionsArgument, context)
				: undefined,
		};
		return;
	}

	const propertyNames = getObjectPropertyNames(properties, context);
	if (!propertyNames) {
		return;
	}

	const inputState = getInputState(input, context);
	const unnecessaryProperties = [];

	for (const [index, property] of properties.entries()) {
		const propertyName = propertyNames[index];
		if (!isUnnecessaryProperty(property, propertyName, inputState, context)) {
			continue;
		}

		unnecessaryProperties.push({property, propertyName});
	}

	const wholeOptionsFix = getWholeOptionsFix(unnecessaryProperties, optionsNode, optionsArgument, context);

	for (const [index, {property, propertyName}] of unnecessaryProperties.entries()) {
		const fix = index === 0 && wholeOptionsFix
			? wholeOptionsFix
			: getFix(property, optionsNode, optionsArgument, context);

		yield {
			node: property.key,
			messageId: MESSAGE_ID_PROPERTY,
			data: {property: propertyName},
			fix,
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
