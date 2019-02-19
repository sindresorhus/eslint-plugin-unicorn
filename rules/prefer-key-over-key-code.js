'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const keys = ['keyCode', 'charCode', 'which'];
const extraCitation = 'See https://goo.gl/cRK532 for more info.';
// https://github.com/facebook/react/blob/b87aabd/packages/react-dom/src/events/getEventKey.js#L36
// only meta characters which can't be deciphered from String.fromCharCode
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
	224: 'Meta'
};

const isPropertyNamedAddEventListener = node =>
	node &&
	node.callee &&
	node.callee.property &&
	node.callee.property.name === 'addEventListener';

const getEventNode = node => {
	const eventListener = getMatchingAncestorOfType(node, 'CallExpression', isPropertyNamedAddEventListener);
	const callback = eventListener && eventListener.arguments && eventListener.arguments[1];
	switch (callback && callback.type) {
		case 'ArrowFunctionExpression':
		case 'FunctionExpression': {
			return callback.params && callback.params[0];
		}

		default:
			return null;
	}
};

const isPropertyOf = (node, objectName) => {
	return (
		node &&
		node.parent &&
		node.parent.object &&
		node.parent.object.name === objectName
	);
};

// Third argument is a condition function, as in passed to Array.filter
// Helpful if nearest node of type also needs to have some other property
const getMatchingAncestorOfType = (node, type, fn = n => n || true) => {
	let current = node;
	while (current) {
		if (current.type === type && fn(current)) {
			return current;
		}

		current = current.parent;
	}

	return null;
};

const fix = node => fixer => {
	const nearestIf = getMatchingAncestorOfType(node, 'IfStatement');
	if (!nearestIf) {
		return;
	}

	const {right, operator} = nearestIf.test;
	const isTestingEquality = operator === '==' || operator === '===';
	const isRightValid =
		isTestingEquality && right.type === 'Literal' && typeof right.value === 'number';
	// Either a meta key or a printable character
	const keyCode = translateToKey[right.value] || String.fromCharCode(right.value);
	// And if we recognize the keyCode
	if (!isRightValid || !keyCode) {
		return;
	}

	// Apply fixes
	return [
		fixer.replaceText(node, 'key'),
		fixer.replaceText(right, `'${keyCode}'`)
	];
};

const create = context => {
	const report = node => {
		context.report({
			message: `Use key instead of ${node.name}. ${extraCitation}`,
			node,
			fix: fix(node)
		});
	};

	return {
		'Identifier:matches([name=keyCode], [name=charCode], [name=which])'(node) {
			// Normal case when usage is direct -> event.keyCode
			const event = getEventNode(node);
			if (!event) {
				return;
			}

			const isPropertyOfEvent = isPropertyOf(node, event.name);
			if (isPropertyOfEvent) {
				report(node);
			}
		},

		Property(node) {
			const propertyName = node.value && node.value.name;
			if (!keys.includes(propertyName)) {
				return;
			}

			const event = getEventNode(node);
			if (!event) {
				return;
			}
			// Destructured case

			const nearestVariableDeclarator = getMatchingAncestorOfType(
				node,
				'VariableDeclarator'
			);
			const isDestructuredFromEvent =
				nearestVariableDeclarator &&
				nearestVariableDeclarator.init &&
				nearestVariableDeclarator.init.name === event.name;

			if (isDestructuredFromEvent) {
				report(node.value);
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
