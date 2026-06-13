import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isNewExpression, isMethodCall, isMemberExpression} from './ast/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isGlobalIdentifier,
	isNullishType,
	isSameReference,
	isUnknownType,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

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

const arrayBufferLikeTypeNames = new Set(['ArrayBuffer', 'SharedArrayBuffer', 'ArrayBufferLike']);
const arrayBufferViewTypeNames = new Set([...typedArrayConstructors, 'DataView', 'ArrayBufferView']);

const getTypeProperty = (type, checker, propertyName) =>
	checker.getPropertyOfType(type, propertyName) ?? checker.getPropertyOfType(checker.getApparentType(type), propertyName);

const getTypePropertyType = (type, checker, propertyName) => {
	const property = getTypeProperty(type, checker, propertyName);
	return property && checker.getTypeOfSymbol(property);
};

const typeInfo = (shouldReport, canSuggest = shouldReport) => ({
	shouldReport,
	canSuggest,
});

function isDefaultLibraryType(type, program, typeNames) {
	const symbol = getTypeSymbol(type);
	return isDefaultLibrarySymbol(symbol, program) && typeNames.has(symbol.getName());
}

function isArrayBufferLikeType(type, checker, program) {
	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isArrayBufferLikeType(constraint, checker, program);
	}

	if (type.isUnion()) {
		return type.types.every(type => isArrayBufferLikeType(type, checker, program));
	}

	return isDefaultLibraryType(type, program, arrayBufferLikeTypeNames);
}

function isNumberType(type, checker) {
	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return isNumberType(constraint, checker);
	}

	if (type.isUnion()) {
		return type.types.every(type => isNumberType(type, checker));
	}

	return type.intrinsicName === 'number';
}

function getBufferTypeInfo(type, checker, program, allowOpaqueBuffer) {
	const typeName = type.aliasSymbol?.getName() ?? type.getSymbol()?.getName();
	if (typeName !== 'Buffer') {
		return typeInfo(false);
	}

	if (isUnknownType(type)) {
		return typeInfo(true);
	}

	const bufferType = getTypePropertyType(type, checker, 'buffer');
	const byteOffsetType = getTypePropertyType(type, checker, 'byteOffset');
	const byteLengthType = getTypePropertyType(type, checker, 'byteLength');

	if (!bufferType && !byteOffsetType && !byteLengthType) {
		return typeInfo(allowOpaqueBuffer, false);
	}

	return typeInfo(Boolean(bufferType)
		&& Boolean(byteOffsetType)
		&& Boolean(byteLengthType)
		&& isArrayBufferLikeType(bufferType, checker, program)
		&& isNumberType(byteOffsetType, checker)
		&& isNumberType(byteLengthType, checker));
}

function getArrayBufferViewTypeInfo(type, checker, program) {
	if (isUnknownType(type)) {
		return typeInfo(true);
	}

	if (type.isUnion()) {
		const nonNullishTypes = type.types.filter(type => !isNullishType(type));
		if (nonNullishTypes.length === 0) {
			return typeInfo(false);
		}

		const typeInfos = nonNullishTypes.map(type => getArrayBufferViewTypeInfo(type, checker, program));
		return typeInfo(
			typeInfos.every(typeInfo => typeInfo.shouldReport),
			typeInfos.every(typeInfo => typeInfo.canSuggest),
		);
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getArrayBufferViewTypeInfo(constraint, checker, program);
	}

	if (isNullishType(type)) {
		return typeInfo(false);
	}

	const isIntersection = type.isIntersection();
	const types = isIntersection ? type.types : [type];
	for (const type of types) {
		if (isUnknownType(type)) {
			return typeInfo(true);
		}

		const baseTypeInfo = getBaseTypes(type, checker)
			.map(type => getArrayBufferViewTypeInfo(type, checker, program))
			.find(typeInfo => typeInfo.shouldReport);
		if (baseTypeInfo) {
			return baseTypeInfo;
		}

		const symbol = getTypeSymbol(type);
		if (isDefaultLibrarySymbol(symbol, program) && arrayBufferViewTypeNames.has(symbol.getName())) {
			return typeInfo(true);
		}

		const bufferTypeInfo = getBufferTypeInfo(type, checker, program, !isIntersection);
		if (bufferTypeInfo.shouldReport) {
			return bufferTypeInfo;
		}
	}

	return typeInfo(false);
}

function getBufferViewTypeInfo(view, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return typeInfo(true);
	}

	try {
		const {program} = parserServices;
		return getArrayBufferViewTypeInfo(
			parserServices.getTypeAtLocation(view),
			program.getTypeChecker(),
			program,
		);
	} catch {
		return typeInfo(true);
	}
}

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

function getBufferViewInfo(node, context) {
	if (node?.type === 'ChainExpression') {
		node = node.expression;
	}

	if (!isMemberExpression(node, {property: 'buffer', computed: false})) {
		return;
	}

	const bufferViewTypeInfo = getBufferViewTypeInfo(node.object, context);
	if (!bufferViewTypeInfo.shouldReport) {
		return;
	}

	return {
		view: node.object,
		isOptional: node.optional === true,
		canSuggest: bufferViewTypeInfo.canSuggest,
	};
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
	const bufferView = getBufferViewInfo(bufferNode, context);
	if (!bufferView) {
		return;
	}

	const {view} = bufferView;
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
		canSuggest: bufferView.canSuggest && !bufferView.isOptional,
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
	const bufferView = getBufferViewInfo(bufferNode, context);
	if (!bufferView) {
		return;
	}

	const {view} = bufferView;
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
		canSuggest: bufferView.canSuggest && !bufferView.isOptional && !node.optional,
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
	if (!isMethodCall(node, {
		method: 'slice',
		maximumArguments: 2,
		computed: false,
	})) {
		return;
	}

	const bufferView = getBufferViewInfo(node.callee.object, context);
	if (!bufferView) {
		return;
	}

	const {view} = bufferView;
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
		canSuggest: bufferView.canSuggest && !bufferView.isOptional && !node.optional,
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

function createProblem({node, context, view, replacement, canSuggest = true}) {
	const problem = {
		node,
		messageId: MESSAGE_ID,
	};

	if (
		canSuggest
		&& context.sourceCode.getCommentsInside(node).length === 0
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
		?? getArrayBufferSliceProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent unsafe use of ArrayBuffer view `.buffer`.',
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
