'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const keys = ['keyCode', 'charCode', 'which'];
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
	node.callee.property.name === 'addEventListener' &&
	node;

const isInsideEventCallback = ancestors => {
	return ancestors.reduce((isInside, current) => {
		return isInside || isPropertyNamedAddEventListener(current);
	}, null);
};

const isPropertyOf = (node, objectName) => {
	return (
		node &&
		node.parent &&
		node.parent.object &&
		node.parent.object.name === objectName
	);
};

const getEventNode = node => {
	switch (node && node.type) {
		case 'ArrowFunctionExpression':
		case 'FunctionExpression': {
			return node.params && node.params[0] && node.params[0].name;
		}

		default:
			return null;
	}
};

const extraCitation = 'See https://goo.gl/cRK532 for more info.';

const util = context => {
	const getNearestAncestorByType = nodes => type => {
		for (let i = nodes.length - 1; i >= 0; i--) {
			if (nodes[i].type === type) {
				return nodes[i];
			}
		}
	};

	const report = reportError(context);
	const ancestors = context.getAncestors();
	const callExpressionNode = isInsideEventCallback(
		ancestors.filter(n => n.type === 'CallExpression')
	);
	const event = getEventNode(
		callExpressionNode && callExpressionNode.arguments[1]
	);
	return {
		report,
		event,
		getNearestAncestorByType: getNearestAncestorByType(ancestors)
	};
};

const directAccessRule = context => node => {
	const {report, event} = util(context);
	// Normal case when usage is direct -> event.keyCode

	const isPropertyOfEvent = isPropertyOf(node, event);
	if (isPropertyOfEvent) {
		report(node);
	}
};

const destructuredPropertyRule = context => node => {
	const propertyName = node.value && node.value.name;
	if (!keys.includes(propertyName)) {
		return;
	}

	const {report, event, getNearestAncestorByType} = util(context);

	// Destructured case
	const nearestVariableDeclarator = getNearestAncestorByType(
		'VariableDeclarator'
	);
	const isDestructuredFromEvent =
		nearestVariableDeclarator &&
		nearestVariableDeclarator.init &&
		nearestVariableDeclarator.init.name === event;

	if (isDestructuredFromEvent) {
		report(node.value);
	}
};

const fix = (context, node) => fixer => {
	const {getNearestAncestorByType} = util(context);
	const nearestIf = getNearestAncestorByType('IfStatement');
	if (!nearestIf) {
		return;
	}

	const {right} = nearestIf.test;
	const isRightValid =
		right.type === 'Literal' && typeof right.value === 'number';

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

const reportError = context => node => {
	context.report({
		message: `Use key instead of ${node.name}. ${extraCitation}`,
		node,
		fix: fix(context, node)
	});
};

const create = context => {
	return {
		'Identifier:matches([name=keyCode], [name=charCode], [name=which])': directAccessRule(
			context
		),
		Property: destructuredPropertyRule(context)
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
