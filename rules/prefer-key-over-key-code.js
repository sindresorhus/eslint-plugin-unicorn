'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const keys = ['keyCode', 'charCode', 'which'];
const keyCodeToKey = {
	8: 'Backspace',
	9: 'Tab',
	13: 'Enter',
	16: 'Shift',
	17: 'Control',
	18: 'Alt',
	20: 'CapsLock',
	27: 'Escape',
	32: ' ',
	33: 'PageUp',
	34: 'PageDown',
	35: 'End',
	36: 'Home',
	37: 'ArrowLeft',
	38: 'ArrowUp',
	39: 'ArrowDown',
	40: 'ArrowDown',
	46: 'Delete',
	48: 0,
	49: 1,
	50: 2,
	51: 3,
	52: 4,
	53: 5,
	54: 6,
	55: 7,
	56: 8,
	57: 9,
	65: 'a',
	66: 'b',
	67: 'c',
	68: 'd',
	69: 'e',
	70: 'f',
	71: 'g',
	72: 'h',
	73: 'i',
	74: 'j',
	75: 'k',
	76: 'l',
	77: 'm',
	78: 'n',
	79: '0',
	80: 'p',
	81: 'q',
	82: 'r',
	83: 's',
	84: 't',
	85: 'u',
	86: 'v',
	87: 'w',
	88: 'x',
	89: 'y',
	90: 'z'
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
	// And if we recognize the keyCode
	if (!isRightValid || !keyCodeToKey[right.value]) {
		return;
	}

	// Apply fixes
	return [
		fixer.replaceText(node, 'key'),
		fixer.replaceText(right, `'${keyCodeToKey[right.value]}'`)
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
