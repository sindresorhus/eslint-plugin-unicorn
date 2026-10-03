import {
	isBooleanLiteral,
	isMethodCall,
	isNullLiteral,
	isStringLiteral,
	isUndefined,
} from './ast/index.js';
import {
	getIndentString,
	getParenthesizedRange,
	getScopes,
	isLeftHandSide,
	getLinebreak,
} from './utils/index.js';

const MESSAGE_ID = 'require-passive-events';
const messages = {
	[MESSAGE_ID]: 'Use `{passive: true}` for this high-frequency event listener.',
};

const passiveEventNames = new Set([
	'touchstart',
	'touchmove',
	'touchenter',
	'touchend',
	'touchleave',
	'wheel',
	'mousewheel',
]);

const isFunction = node =>
	node.type === 'ArrowFunctionExpression'
	|| node.type === 'FunctionExpression';

const getPropertyName = property => {
	if (property.key.type === 'Identifier') {
		return property.key.name;
	}

	if (isStringLiteral(property.key)) {
		return property.key.value;
	}
};

const getMemberPropertyName = memberExpression => {
	if (
		!memberExpression.computed
		&& memberExpression.property.type === 'Identifier'
	) {
		return memberExpression.property.name;
	}

	if (isStringLiteral(memberExpression.property)) {
		return memberExpression.property.value;
	}
};

const getPassiveProperty = optionsNode =>
	optionsNode.properties.findLast(property =>
		property.type === 'Property'
		&& getPropertyName(property) === 'passive');

// `passive` is inserted after the last property, and an empty object is rebuilt, so a comment there would be moved or lost
const hasCommentsBeforeClosingBrace = (optionsNode, sourceCode) => {
	const tokenBefore = optionsNode.properties.at(-1) ?? sourceCode.getFirstToken(optionsNode);
	const closingBrace = sourceCode.getLastToken(optionsNode);
	return sourceCode.getTokensBetween(tokenBefore, closingBrace, {includeComments: true})
		.some(token => token.type === 'Block' || token.type === 'Line');
};

const getOutermostMemberExpression = memberExpression => {
	while (
		memberExpression.parent.type === 'MemberExpression'
		&& memberExpression.parent.object === memberExpression
	) {
		memberExpression = memberExpression.parent;
	}

	return memberExpression;
};

const isReadOnlyMemberExpression = memberExpression => {
	const outermostMemberExpression = getOutermostMemberExpression(memberExpression);
	return !isLeftHandSide(outermostMemberExpression);
};

const isListenerArgumentsScope = (scope, listener) => {
	let node = scope.block;
	while (node && node !== listener) {
		if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
			return false;
		}

		node = node.parent;
	}

	return node === listener;
};

const usesArguments = (listener, sourceCode) =>
	listener.type === 'FunctionExpression'
	&& getScopes(sourceCode.getScope(listener)).some(scope =>
		isListenerArgumentsScope(scope, listener)
		&& scope.references.some(({identifier}) => identifier.name === 'arguments'));

const isSafeEventPropertyReference = identifier => {
	if (
		identifier.parent.type !== 'MemberExpression'
		|| identifier.parent.object !== identifier
	) {
		return false;
	}

	const propertyName = getMemberPropertyName(identifier.parent);
	return propertyName && propertyName !== 'preventDefault' && isReadOnlyMemberExpression(identifier.parent);
};

const isEventParameterSafe = (listener, context) => {
	if (usesArguments(listener, context.sourceCode)) {
		return false;
	}

	// Skip the TypeScript `this` parameter
	const [eventParameter] = listener.params[0]?.name === 'this' ? listener.params.slice(1) : listener.params;
	if (!eventParameter) {
		return true;
	}

	if (eventParameter.type !== 'Identifier') {
		return false;
	}

	const eventVariable = context.sourceCode.getDeclaredVariables(listener).find(variable =>
		variable.defs[0]?.name === eventParameter);

	for (const {identifier} of eventVariable.references) {
		if (!isSafeEventPropertyReference(identifier)) {
			return false;
		}
	}

	return true;
};

const fixMissingOptions = (listener, context) => fixer =>
	// Insert after any parentheses around the listener so the option isn't swallowed
	// into a sequence expression, e.g. `((() => {}, {passive: true}))`.
	fixer.insertTextAfterRange(getParenthesizedRange(listener, context), ', {passive: true}');

const fixBooleanOptions = optionsNode => fixer =>
	fixer.replaceText(
		optionsNode,
		isBooleanLiteral(optionsNode, true) ? '{capture: true, passive: true}' : '{passive: true}',
	);

const fixObjectOptionsWithoutPassive = (optionsNode, context) => fixer => {
	const {sourceCode} = context;
	if (optionsNode.properties.length === 0) {
		return fixer.replaceText(optionsNode, '{passive: true}');
	}

	const lastProperty = optionsNode.properties.at(-1);
	if (sourceCode.getLoc(optionsNode).start.line === sourceCode.getLoc(optionsNode).end.line) {
		return fixer.insertTextAfter(lastProperty, ', passive: true');
	}

	const tokenAfterLastProperty = sourceCode.getTokenAfter(lastProperty);
	const indent = getIndentString(lastProperty, context);
	const linebreak = getLinebreak(context);
	return tokenAfterLastProperty.value === ','
		? fixer.insertTextAfter(tokenAfterLastProperty, `${linebreak}${indent}passive: true,`)
		: fixer.insertTextAfter(lastProperty, `,${linebreak}${indent}passive: true`);
};

const fixPassiveFalse = passiveProperty => fixer =>
	fixer.replaceText(passiveProperty.value, 'true');

const getOptionsProblem = (context, callExpression, optionsNode) => {
	if (!optionsNode) {
		return {
			fix: fixMissingOptions(callExpression.arguments[1], context),
		};
	}

	if (isBooleanLiteral(optionsNode, true) || isBooleanLiteral(optionsNode, false)) {
		return {
			fix: fixBooleanOptions(optionsNode),
		};
	}

	// `undefined`/`null` is the same as omitting the argument, so no passive listener is installed
	if (isUndefined(optionsNode) || isNullLiteral(optionsNode)) {
		return {};
	}

	if (optionsNode.type !== 'ObjectExpression' || optionsNode.properties.some(property => property.type === 'SpreadElement' || property.computed)) {
		return;
	}

	const passiveProperty = getPassiveProperty(optionsNode);
	if (!passiveProperty) {
		return {
			fix: hasCommentsBeforeClosingBrace(optionsNode, context.sourceCode) ? undefined : fixObjectOptionsWithoutPassive(optionsNode, context),
		};
	}

	if (isBooleanLiteral(passiveProperty.value, false)) {
		return {
			fix: fixPassiveFalse(passiveProperty),
		};
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'addEventListener',
			minimumArguments: 2,
			maximumArguments: 3,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [eventNameNode, listener, optionsNode] = callExpression.arguments;
		if (
			!isStringLiteral(eventNameNode)
			|| !passiveEventNames.has(eventNameNode.value)
			|| !isFunction(listener)
			|| !isEventParameterSafe(listener, context)
		) {
			return;
		}

		const problem = getOptionsProblem(context, callExpression, optionsNode);
		if (!problem) {
			return;
		}

		return {
			node: eventNameNode,
			messageId: MESSAGE_ID,
			...problem,
		};
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
			description: 'Require passive event listeners for high-frequency events.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
