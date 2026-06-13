import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'no-canvas-to-image';
const messages = {
	[MESSAGE_ID]: 'Prefer drawing the canvas directly with `drawImage()`.',
};

const getExpressionWithoutAwait = node => {
	while (node?.type === 'AwaitExpression') {
		node = node.argument;
	}

	return node;
};

function getDirectExpressionOrOneUseConstInitializer(node, sourceCode) {
	node = getExpressionWithoutAwait(node);

	if (node?.type !== 'Identifier') {
		return node;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	if (
		!variable
		|| variable.identifiers.length !== 1
		|| variable.references.length !== 2
	) {
		return;
	}

	const [identifier] = variable.identifiers;
	if (
		identifier.parent.type !== 'VariableDeclarator'
		|| identifier.parent.id !== identifier
		|| identifier.parent.parent.type !== 'VariableDeclaration'
		|| identifier.parent.parent.kind !== 'const'
		|| sourceCode.getRange(identifier)[0] > sourceCode.getRange(node)[0]
	) {
		return;
	}

	return getExpressionWithoutAwait(identifier.parent.init);
}

const isCanvasLikeName = name => name.toLowerCase().includes('canvas');

const isCanvasLikeExpression = node => {
	if (node.type === 'Identifier') {
		return isCanvasLikeName(node.name);
	}

	return node.type === 'MemberExpression'
		&& !node.computed
		&& node.property.type === 'Identifier'
		&& isCanvasLikeName(node.property.name);
};

const isToDataUrlCall = node =>
	isMethodCall(node, {
		method: 'toDataURL',
		optionalCall: false,
		optionalMember: false,
	})
	&& isCanvasLikeExpression(node.callee.object);

const isLoadImageFromCanvasLikeDataUrlCall = node =>
	node?.type === 'CallExpression'
	&& !node.optional
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'loadImage'
	&& node.arguments.length > 0
	&& node.arguments[0].type !== 'SpreadElement'
	&& isToDataUrlCall(node.arguments[0]);

const isGetImageDataCall = node =>
	isMethodCall(node, {
		method: 'getImageData',
		optionalCall: false,
		optionalMember: false,
	});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'drawImage',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [image] = node.arguments;
		if (image.type === 'SpreadElement') {
			return;
		}

		if (!isLoadImageFromCanvasLikeDataUrlCall(getDirectExpressionOrOneUseConstInitializer(image, sourceCode))) {
			return;
		}

		return {
			node: image,
			messageId: MESSAGE_ID,
		};
	});

	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'putImageData',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [imageData] = node.arguments;
		if (imageData.type === 'SpreadElement') {
			return;
		}

		if (!isGetImageDataCall(getDirectExpressionOrOneUseConstInitializer(imageData, sourceCode))) {
			return;
		}

		return {
			node: imageData,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer drawing canvases directly instead of converting them to images.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
