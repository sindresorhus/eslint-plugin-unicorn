'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const keys = ['keyCode', 'charCode', 'which'];

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

const getNearestAncestorByType = (nodes, type) => {
	for (let i = nodes.length - 1; i >= 0; i--) {
		if (nodes[i].type === type) {
			return nodes[i];
		}
	}
};

const extraCitation = 'See https://goo.gl/cRK532 for more info.';

const util = context => {
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
		ancestors
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

	const {report, event, ancestors} = util(context);

	// Destructured case
	const nearestVariableDeclarator = getNearestAncestorByType(
		ancestors,
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

const reportError = context => node => {
	context.report({
		message: `Use key instead of ${node.name}. ${extraCitation}`,
		node
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
		}
	}
};
