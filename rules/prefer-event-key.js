'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');

const keys = new Set([
	'keyCode',
	'charCode',
	'which'
]);

// https://github.com/facebook/react/blob/b87aabd/packages/react-dom/src/events/getEventKey.js#L36
// Only meta characters which can't be deciphered from `String.fromCharCode()`
const translateToKey = {
	8: 'Backspace',
	9: 'Tab',
	12: 'Clear',
	13: 'Enter',
	16: 'Shift',
	17: 'Control',
	18: 'Alt',
	19: 'Pause',
	20: 'CapsLock',
	27: 'Escape',
	32: ' ',
	33: 'PageUp',
	34: 'PageDown',
	35: 'End',
	36: 'Home',
	37: 'ArrowLeft',
	38: 'ArrowUp',
	39: 'ArrowRight',
	40: 'ArrowDown',
	45: 'Insert',
	46: 'Delete',
	112: 'F1',
	113: 'F2',
	114: 'F3',
	115: 'F4',
	116: 'F5',
	117: 'F6',
	118: 'F7',
	119: 'F8',
	120: 'F9',
	121: 'F10',
	122: 'F11',
	123: 'F12',
	144: 'NumLock',
	145: 'ScrollLock',
	186: ';',
	187: '=',
	188: ',',
	189: '-',
	190: '.',
	191: '/',
	219: '[',
	220: '\\',
	221: ']',
	222: '\'',
	224: 'Meta'
};

const isPropertyNamedAddEventListener = node =>
	node &&
	node.type === 'CallExpression' &&
	node.callee &&
	node.callee.type === 'MemberExpression' &&
	node.callee.property &&
	node.callee.property.name === 'addEventListener';

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
				references
			};
		}

		default:
			return {};
	}
};

const isPropertyOf = (node, eventNode) => {
	return (
		node &&
		node.parent &&
		node.parent.type === 'MemberExpression' &&
		node.parent.object &&
		node.parent.object === eventNode
	);
};

// The third argument is a condition function, as one passed to `Array#filter()`
// Helpful if nearest node of type also needs to have some other property
const getMatchingAncestorOfType = (node, type, fn = () => true) => {
	let current = node;
	while (current) {
		if (current.type === type && fn(current)) {
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

	const {right = {}, operator} = nearestIf.test;
	const isTestingEquality = operator === '==' || operator === '===';
	const isRightValid = isTestingEquality && right.type === 'Literal' && typeof right.value === 'number';
	// Either a meta key or a printable character
	const keyCode = translateToKey[right.value] || String.fromCharCode(right.value);
	// And if we recognize the `.keyCode`
	if (!isRightValid || !keyCode) {
		return;
	}

	// Apply fixes
	return [
		fixer.replaceText(node, 'key'),
		fixer.replaceText(right, quoteString(keyCode))
	];
};

const create = context => {
	const report = node => {
		context.report({
			message: `Use \`.key\` instead of \`.${node.name}\``,
			node,
			fix: fix(node)
		});
	};

	return {
		'Identifier:matches([name="keyCode"], [name="charCode"], [name="which"])'(node) {
			// Normal case when usage is direct -> `event.keyCode`
			const {event, references} = getEventNodeAndReferences(context, node);
			if (!event) {
				return;
			}

			if (
				references &&
				references.find(reference => isPropertyOf(node, reference.identifier))
			) {
				report(node);
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
				'VariableDeclarator'
			);
			const initObject =
				nearestVariableDeclarator &&
				nearestVariableDeclarator.init &&
				nearestVariableDeclarator.init;

			// Make sure initObject is a reference of eventVariable
			if (
				references &&
				references.find(reference => reference.identifier === initObject)
			) {
				report(node.value);
				return;
			}

			// When the event parameter itself is destructured directly
			const isEventParameterDestructured = event.type === 'ObjectPattern';
			if (isEventParameterDestructured) {
				// Check for properties
				for (const property of event.properties) {
					if (property === node) {
						report(node.value);
					}
				}
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
