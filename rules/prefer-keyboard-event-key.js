import escapeString from './utils/escape-string.js';
import translateToKey from './shared/event-keys.js';
import {isFunction, isMethodCall, isNumericLiteral} from './ast/index.js';

const MESSAGE_ID = 'prefer-keyboard-event-key';
const SUGGESTION_MESSAGE_ID = 'prefer-keyboard-event-key/suggestion';
const messages = {
	[MESSAGE_ID]: 'Use `.key` instead of `.{{name}}`.',
	[SUGGESTION_MESSAGE_ID]: 'Use `.key` with `{{key}}`.',
};

const keys = new Set([
	'keyCode',
	'charCode',
	'which',
]);

const keyboardEventHandlerNames = new Set([
	'onKeyDown',
	'onKeyPress',
	'onKeyUp',
]);

const isAddEventListenerCall = node =>
	isMethodCall(node, {
		method: 'addEventListener',
		minimumArguments: 2,
		optionalCall: false,
		optionalMember: false,
	});

const isKeyboardEventHandlerAttribute = node =>
	node.type === 'JSXAttribute'
	&& node.name.type === 'JSXIdentifier'
	&& keyboardEventHandlerNames.has(node.name.name);

const isKeyboardEventJsxHandler = node =>
	node.parent.type === 'JSXExpressionContainer'
	&& node.parent.expression === node
	&& node.parent.parent.type === 'JSXAttribute'
	&& node.parent.parent.value === node.parent
	&& isKeyboardEventHandlerAttribute(node.parent.parent);

const isKeyboardEventTypeName = typeName => {
	if (typeName.type === 'Identifier') {
		return typeName.name === 'KeyboardEvent';
	}

	return typeName.type === 'TSQualifiedName'
		&& typeName.left.type === 'Identifier'
		&& typeName.left.name === 'React'
		&& typeName.right.type === 'Identifier'
		&& typeName.right.name === 'KeyboardEvent';
};

const isKeyboardEventTypeAnnotation = node =>
	node?.type === 'TSTypeAnnotation'
	&& node.typeAnnotation.type === 'TSTypeReference'
	&& isKeyboardEventTypeName(node.typeAnnotation.typeName);

const getParameterEventContexts = (context, functionNode) => {
	const eventContexts = [];
	const isInlineCallback = functionNode.type === 'ArrowFunctionExpression' || functionNode.type === 'FunctionExpression';

	if (
		isInlineCallback
		&& isAddEventListenerCall(functionNode.parent)
		&& functionNode.parent.arguments[1] === functionNode
	) {
		eventContexts.push({
			parameter: functionNode.params[0],
			shouldAutofix: true,
		});
	}

	if (
		isInlineCallback
		&& isKeyboardEventJsxHandler(functionNode)
	) {
		eventContexts.push({
			parameter: functionNode.params[0],
			shouldAutofix: false,
		});
	}

	for (const parameter of functionNode.params) {
		if (isKeyboardEventTypeAnnotation(parameter.typeAnnotation)) {
			eventContexts.push({
				parameter,
				shouldAutofix: false,
			});
		}
	}

	const variables = context.sourceCode.getDeclaredVariables(functionNode);
	return eventContexts
		.filter(({parameter}) => parameter)
		.map(eventContext => ({
			...eventContext,
			references: variables.find(variable => variable.identifiers.includes(eventContext.parameter))?.references,
		}));
};

const isPropertyOf = (node, eventNode) =>
	node?.parent?.type === 'MemberExpression'
	&& node.parent.property === node
	&& !node.parent.computed
	&& node.parent.object === eventNode;

// The third argument is a condition function, as one passed to `Array#filter()`
// Helpful if nearest node of type also needs to have some other property
const getMatchingAncestorOfType = (node, type, testFunction = () => true) => {
	let current = node;
	while (current) {
		if (current.type === type && testFunction(current)) {
			return current;
		}

		current = current.parent;
	}
};

const getParentByLevel = (node, level) => {
	let current = node;
	while (current && level) {
		level--;
		current = current.parent;
	}

	/* c8 ignore next 3 */
	if (level === 0) {
		return current;
	}
};

const getEventContexts = (context, node) => {
	const eventContexts = [];

	for (let current = node.parent; current; current = current.parent) {
		if (!isFunction(current)) {
			continue;
		}

		eventContexts.push(...getParameterEventContexts(context, current));
	}

	return eventContexts;
};

const getKey = value => {
	if (translateToKey[value]) {
		return translateToKey[value];
	}

	if (
		Number.isInteger(value)
		&& value >= 0
		&& value <= 0x10_FF_FF
	) {
		return String.fromCodePoint(value);
	}
};

const getReplacement = node => {
	// Since we're only fixing direct property access usages, like `event.keyCode`
	if (
		node.parent?.type !== 'MemberExpression'
		|| node.parent.property !== node
	) {
		return;
	}

	const nearestIf = getParentByLevel(node, 3);
	if (!nearestIf || nearestIf.type !== 'IfStatement') {
		return;
	}

	const {type, operator, right} = nearestIf.test;
	if (
		!(
			type === 'BinaryExpression'
			&& nearestIf.test.left === node.parent
			&& (operator === '==' || operator === '===')
			&& isNumericLiteral(right)
		)
	) {
		return;
	}

	// Either a standard key value or a printable character
	const key = getKey(right.value);
	if (!key) {
		return;
	}

	return {
		key,
		right,
	};
};

const getProblem = (node, {shouldAutofix}) => {
	const replacement = getReplacement(node);
	const problem = {
		messageId: MESSAGE_ID,
		data: {name: node.name},
		node,
	};

	if (!replacement) {
		return problem;
	}

	const fix = fixer => [
		fixer.replaceText(node, 'key'),
		fixer.replaceText(replacement.right, escapeString(replacement.key)),
	];

	if (shouldAutofix) {
		problem.fix = fix;
		return problem;
	}

	problem.suggest = [
		{
			messageId: SUGGESTION_MESSAGE_ID,
			data: {key: replacement.key},
			fix,
		},
	];

	return problem;
};

const isPropertyKey = node =>
	node.parent.type === 'Property'
	&& node.parent.key === node
	&& node.parent.parent.type === 'ObjectPattern'
	&& !node.parent.computed;

const isEventParameterDestructured = (node, {parameter}) =>
	parameter?.type === 'ObjectPattern'
	&& parameter.properties.includes(node.parent);

const isEventVariableDestructured = (node, {references}) => {
	const nearestVariableDeclarator = getMatchingAncestorOfType(
		node,
		'VariableDeclarator',
	);
	const initObject = nearestVariableDeclarator?.init;

	// Make sure initObject is a reference of eventVariable
	return references
		&& nearestVariableDeclarator?.id === node.parent.parent
		&& references.some(reference => reference.identifier === initObject);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Identifier', node => {
		if (!keys.has(node.name)) {
			return;
		}

		// Normal case when usage is direct -> `event.keyCode`
		for (const eventContext of getEventContexts(context, node)) {
			if (eventContext.references?.some(reference => isPropertyOf(node, reference.identifier))) {
				return getProblem(node, eventContext);
			}
		}
	});

	context.on('Property', node => {
		// Destructured case
		if (
			node.key.type !== 'Identifier'
			|| !keys.has(node.key.name)
			|| !isPropertyKey(node.key)
		) {
			return;
		}

		for (const eventContext of getEventContexts(context, node)) {
			if (isEventVariableDestructured(node.key, eventContext)) {
				return getProblem(node.key, eventContext);
			}
		}

		// When the event parameter itself is destructured directly
		// Check for properties
		for (const eventContext of getEventContexts(context, node)) {
			if (isEventParameterDestructured(node.key, eventContext)) {
				return getProblem(node.key, eventContext);
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `KeyboardEvent#key` over deprecated keyboard event properties.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
