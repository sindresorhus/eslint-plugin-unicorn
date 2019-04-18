'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'preferFlatMap';

const isFlat = node => {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'flat'
	);
};

const isMap = node => {
	return (
		node.type === 'CallExpression' &&
		node.callee.type === 'MemberExpression' &&
		node.callee.property.type === 'Identifier' &&
		node.callee.property.name === 'map'
	);
};

const report = (context, nodeFlat, nodeMap) => {
	context.report({
		node: nodeFlat,
		messageId: MESSAGE_ID,
		fix: fixer => {
			return [
				fixer.removeRange([nodeMap.end, nodeFlat.end]),
				fixer.replaceText(nodeMap.callee.property, 'flatMap')
			];
		}
	});
};

const create = context => ({
	CallExpression: node => {
		if (!isFlat(node)) {
			return;
		}

		const parent = node.callee.object;

		if (!isMap(parent)) {
			return;
		}

		report(context, node, parent);
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		messages: {
			[MESSAGE_ID]: 'Use `.flatMap()`, rather than `.map(...).flat()`.'
		}
	}
};
