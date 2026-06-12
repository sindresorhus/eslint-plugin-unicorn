import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isNewExpression, isMethodCall, isMemberExpression} from './ast/index.js';
import {isGlobalIdentifier, isSameReference, shouldAddParenthesesToMemberExpressionObject} from './utils/index.js';

const MESSAGE_ID = 'no-unsafe-buffer-conversion/error';
const SUGGESTION_ID = 'no-unsafe-buffer-conversion/suggestion';
const messages = {
	[MESSAGE_ID]: 'Preserve `byteOffset` and `byteLength` when converting an ArrayBuffer view through `.buffer`.',
	[SUGGESTION_ID]: 'Preserve `byteOffset` and `byteLength`.',
};

const bufferImportSources = new Set(['buffer', 'node:buffer']);
const globalObjectNames = new Set(['globalThis', 'window', 'self', 'global']);

const bytesPerElementByTypedArrayConstructor = new Map([
	['Int8Array', 1],
	['Uint8Array', 1],
	['Uint8ClampedArray', 1],
	['Int16Array', 2],
	['Uint16Array', 2],
	['Float16Array', 2],
	['Int32Array', 4],
	['Uint32Array', 4],
	['Float32Array', 4],
	['Float64Array', 8],
	['BigInt64Array', 8],
	['BigUint64Array', 8],
]);

const typedArrayConstructors = new Set(bytesPerElementByTypedArrayConstructor.keys());

function isImportedBuffer(identifier, context) {
	const variable = findVariable(context.sourceCode.getScope(identifier), identifier);

	return variable?.defs.some(definition => {
		if (definition.type !== 'ImportBinding' || !bufferImportSources.has(definition.parent.source.value)) {
			return false;
		}

		const {node} = definition;
		return node.type === 'ImportSpecifier' && node.imported.name === 'Buffer';
	}) ?? false;
}

function isBufferReference(node, context) {
	if (isMemberExpression(node, {property: 'Buffer', computed: false})) {
		return globalObjectNames.has(node.object.name) && isGlobalIdentifier(node.object, context);
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	return (node.name === 'Buffer' && isGlobalIdentifier(node, context))
		|| isImportedBuffer(node, context);
}

const isByteOffsetMemberExpression = (node, view) =>
	isMemberExpression(node, {property: 'byteOffset', computed: false})
	&& isSameReference(node.object, view);

const isByteLengthMemberExpression = (node, view) =>
	isMemberExpression(node, {property: 'byteLength', computed: false})
	&& isSameReference(node.object, view);

const isGlobalUndefined = (node, context) =>
	node?.type === 'Identifier'
	&& node.name === 'undefined'
	&& isGlobalIdentifier(node, context);

const isZeroLiteral = node =>
	node?.type === 'Literal'
	&& node.value === 0;

const isKnownUnsafeByteOffset = (node, context, view) =>
	isZeroLiteral(node)
	|| isGlobalUndefined(node, context)
	|| (
		isMemberExpression(node, {properties: ['byteLength', 'length'], computed: false})
		&& isSameReference(node.object, view)
	);

const isBufferByteLengthMemberExpression = (node, view) =>
	isMemberExpression(node, {property: 'byteLength', computed: false})
	&& isMemberExpression(node.object, {property: 'buffer', computed: false})
	&& isSameReference(node.object.object, view);

const isKnownUnsafeByteLength = (node, context, view) =>
	isGlobalUndefined(node, context)
	|| isBufferByteLengthMemberExpression(node, view);

function getBufferView(node) {
	if (!isMemberExpression(node, {property: 'buffer', computed: false})) {
		return;
	}

	return node.object;
}

const getBytesPerElement = constructorName => bytesPerElementByTypedArrayConstructor.get(constructorName);

function isMatchingBytesPerElement(node, constructorName) {
	return isMemberExpression(node, {property: 'BYTES_PER_ELEMENT', computed: false})
		&& node.object.type === 'Identifier'
		&& getBytesPerElement(node.object.name) === getBytesPerElement(constructorName);
}

function isSafeTypedArrayLength(node, view, constructorName) {
	if (getBytesPerElement(constructorName) === 1) {
		return isByteLengthMemberExpression(node, view);
	}

	return node.type === 'BinaryExpression'
		&& node.operator === '/'
		&& isByteLengthMemberExpression(node.left, view)
		&& isMatchingBytesPerElement(node.right, constructorName);
}

function getSafeLengthText({viewText, constructorName}) {
	return getBytesPerElement(constructorName) === 1
		? `${viewText}.byteLength`
		: `${viewText}.byteLength / ${constructorName}.BYTES_PER_ELEMENT`;
}

function getViewText(view, context) {
	const viewText = context.sourceCode.getText(view);
	return shouldAddParenthesesToMemberExpressionObject(view, context) ? `(${viewText})` : viewText;
}

function getTypedArrayProblem(node, context) {
	if (
		node.callee.type !== 'Identifier'
		|| !typedArrayConstructors.has(node.callee.name)
		|| !isGlobalIdentifier(node.callee, context)
	) {
		return;
	}

	const [bufferNode, byteOffsetNode, lengthNode] = node.arguments;
	const view = getBufferView(bufferNode);
	if (!view) {
		return;
	}

	if (byteOffsetNode && lengthNode) {
		const hasSafeByteOffset = isByteOffsetMemberExpression(byteOffsetNode, view);
		const hasSafeLength = isSafeTypedArrayLength(lengthNode, view, node.callee.name);

		if (hasSafeByteOffset && hasSafeLength) {
			return;
		}

		const hasUnsafeByteOffset = isKnownUnsafeByteOffset(byteOffsetNode, context, view);
		const hasUnsafeLength = !hasSafeLength && (
			isKnownUnsafeByteLength(lengthNode, context, view)
			|| isMatchingUnsafeTypedArrayLength(lengthNode, view, node.callee.name)
		);

		if (!hasUnsafeByteOffset && !hasUnsafeLength) {
			return;
		}
	}

	return createProblem({
		node,
		context,
		view,
		replacement: getTypedArrayReplacement(node, context, view),
	});
}

function isMatchingUnsafeTypedArrayLength(node, view, constructorName) {
	return isByteLengthMemberExpression(node, view)
		|| (
			node.type === 'BinaryExpression'
			&& node.operator === '/'
			&& isByteLengthMemberExpression(node.left, view)
			&& isMemberExpression(node.right, {property: 'BYTES_PER_ELEMENT', computed: false})
			&& node.right.object.type === 'Identifier'
			&& typedArrayConstructors.has(node.right.object.name)
			&& getBytesPerElement(node.right.object.name) !== getBytesPerElement(constructorName)
		);
}

function getTypedArrayReplacement(node, context, view) {
	const viewText = getViewText(view, context);
	const lengthText = getSafeLengthText({viewText, constructorName: node.callee.name});

	return `new ${node.callee.name}(${viewText}.buffer, ${viewText}.byteOffset, ${lengthText})`;
}

function getBufferFromProblem(node, context) {
	if (
		!isMethodCall(node, {
			method: 'from',
			minimumArguments: 1,
			maximumArguments: 3,
			computed: false,
		})
		|| !isBufferReference(node.callee.object, context)
	) {
		return;
	}

	const [bufferNode, byteOffsetNode, lengthNode] = node.arguments;
	const view = getBufferView(bufferNode);
	if (!view) {
		return;
	}

	if (byteOffsetNode && lengthNode) {
		const hasSafeByteOffset = isByteOffsetMemberExpression(byteOffsetNode, view);
		const hasSafeLength = isByteLengthMemberExpression(lengthNode, view);

		if (hasSafeByteOffset && hasSafeLength) {
			return;
		}

		const hasUnsafeByteOffset = isKnownUnsafeByteOffset(byteOffsetNode, context, view);
		const hasUnsafeLength = isKnownUnsafeByteLength(lengthNode, context, view)
			|| isUnsafeBufferFromLength(lengthNode, view);

		if (!hasUnsafeByteOffset && !hasUnsafeLength) {
			return;
		}
	}

	return createProblem({
		node,
		context,
		view,
		replacement: getBufferFromReplacement(node, context, view),
	});
}

function isUnsafeBufferFromLength(node, view) {
	return node.type === 'BinaryExpression'
		&& node.operator === '/'
		&& isByteLengthMemberExpression(node.left, view)
		&& isMemberExpression(node.right, {property: 'BYTES_PER_ELEMENT', computed: false})
		&& node.right.object.type === 'Identifier'
		&& getBytesPerElement(node.right.object.name) > 1;
}

function getBufferFromReplacement(node, context, view) {
	const viewText = getViewText(view, context);

	return `${context.sourceCode.getText(node.callee)}(${viewText}.buffer, ${viewText}.byteOffset, ${viewText}.byteLength)`;
}

function getArrayBufferSliceProblem(node, context) {
	if (!isMethodCall(node, {method: 'slice', maximumArguments: 2, computed: false})) {
		return;
	}

	const view = getBufferView(node.callee.object);
	if (!view) {
		return;
	}

	const [startNode, endNode] = node.arguments;
	if (startNode && endNode) {
		const hasSafeStart = isByteOffsetMemberExpression(startNode, view);
		const hasSafeEnd = isSafeSliceEnd(endNode, view);

		if (hasSafeStart && hasSafeEnd) {
			return;
		}

		const hasUnsafeStart = isKnownUnsafeByteOffset(startNode, context, view);
		const hasUnsafeEnd = (
			hasSafeStart
			&& isByteLengthMemberExpression(endNode, view)
		) || isKnownUnsafeByteLength(endNode, context, view);

		if (!hasUnsafeStart && !hasUnsafeEnd) {
			return;
		}
	}

	return createProblem({
		node,
		context,
		view,
		replacement: getArrayBufferSliceReplacement(node, context, view),
	});
}

function isSafeSliceEnd(node, view) {
	return node.type === 'BinaryExpression'
		&& node.operator === '+'
		&& isByteOffsetMemberExpression(node.left, view)
		&& isByteLengthMemberExpression(node.right, view);
}

function getArrayBufferSliceReplacement(node, context, view) {
	const viewText = getViewText(view, context);

	return `${context.sourceCode.getText(node.callee)}(${viewText}.byteOffset, ${viewText}.byteOffset + ${viewText}.byteLength)`;
}

function createProblem({node, context, view, replacement}) {
	const problem = {
		node,
		messageId: MESSAGE_ID,
	};

	if (
		context.sourceCode.getCommentsInside(node).length === 0
		&& !hasSideEffect(view, context.sourceCode, {considerGetters: true})
	) {
		problem.suggest = [
			{
				messageId: SUGGESTION_ID,
				fix: fixer => fixer.replaceText(node, replacement),
			},
		];
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('NewExpression', node => {
		if (isNewExpression(node, {minimumArguments: 1, maximumArguments: 3})) {
			return getTypedArrayProblem(node, context);
		}
	});

	context.on('CallExpression', node =>
		getBufferFromProblem(node, context)
		?? getArrayBufferSliceProblem(node, context),
	);
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent unsafe conversions between `Buffer` and typed arrays.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
