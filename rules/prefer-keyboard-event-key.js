'use strict';
const quoteString = require('./utils/quote-string.js');
const translateToKey = require('./shared/event-keys.js');

const MESSAGE_ID = 'prefer-keyboard-event-key';
const messages = {
	[MESSAGE_ID]: 'Use `.key` instead of `.{{name}}`.',
};

const keys = new Set([
	'keyCode',
	'charCode',
	'which',
]);

const isPropertyNamedAddEventListener = node =>
	node
	&& node.type === 'CallExpression'
	&& node.callee
	&& node.callee.type === 'MemberExpression'
	&& node.callee.property
	&& node.callee.property.name === 'addEventListener';

const getEventNodeAndReferences = (context, node) => {
	const eventListener = getMatchingAncestorOfType(node, 'CallExpression', isPropertyNamedAddEventListener);
	const callback = eventListener && eventListener.arguments && eventListener.arguments[1];
	switch (callback && callback.type) {
		case 'ArrowFunctionExpression':
		case 'FunctionExpression': {
			const eventVariable = context.getDeclaredVariables(callback)[0];
			const references = eventVariable && eventVariable.references;
			return {
				event: callback.params && callback.params[0],
				references,
			};
		}

		default:
			return {};
	}
};

const isPropertyOf = (node, eventNode) =>
	node
	&& node.parent
	&& node.parent.type === 'MemberExpression'
	&& node.parent.object
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

	/* istanbul ignore else */
	if (level === 0) {
		return current;
	}
};

const fix = node => fixer => {
	// Since we're only fixing direct property access usages, like `event.keyCode`
	const nearestIf = getParentByLevel(node, 3);
	if (!nearestIf || nearestIf.type !== 'IfStatement') {
		return;
	}

	const {type, operator, right} = nearestIf.test;
	if (
		!(
			type === 'BinaryExpression'
			&& (operator === '==' || operator === '===')
			&& right.type === 'Literal'
			&& typeof right.value === 'number'
		)
	) {
		return;
	}

	// Either a meta key or a printable character
	const key = translateToKey[right.value] || String.fromCodePoint(right.value);
	// And if we recognize the `.keyCode`
	if (!key) {
		return;
	}

	// Apply fixes
	return [
		fixer.replaceText(node, 'key'),
		fixer.replaceText(right, quoteString(key)),
	];
};

const getProblem = node => ({
	messageId: MESSAGE_ID,
	data: {name: node.name},
	node,
	fix: fix(node),
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	'Identifier:matches([name="keyCode"], [name="charCode"], [name="which"])'(node) {
		// Normal case when usage is direct -> `event.keyCode`
		const {event, references} = getEventNodeAndReferences(context, node);
		if (!event) {
			return;
		}

		if (
			references
			&& references.some(reference => isPropertyOf(node, reference.identifier))
		) {
			return getProblem(node);
		}
	},

	Property(node) {
		// Destructured case
		const propertyName = node.value && node.value.name;
		if (!keys.has(propertyName)) {
			return;
		}

		const {event, references} = getEventNodeAndReferences(context, node);
		if (!event) {
			return;
		}

		const nearestVariableDeclarator = getMatchingAncestorOfType(
			node,
			'VariableDeclarator',
		);
		const initObject
			= nearestVariableDeclarator
				&& nearestVariableDeclarator.init
				&& nearestVariableDeclarator.init;

		// Make sure initObject is a reference of eventVariable
		if (
			references
			&& references.some(reference => reference.identifier === initObject)
		) {
			return getProblem(node.value);
		}

		// When the event parameter itself is destructured directly
		const isEventParameterDestructured = event.type === 'ObjectPattern';
		if (isEventParameterDestructured) {
			// Check for properties
			for (const property of event.properties) {
				if (property === node) {
					return getProblem(node.value);
				}
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`.',
		},
		fixable: 'code',
		messages,
	},
};
