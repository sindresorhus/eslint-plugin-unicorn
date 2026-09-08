import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isEmptyArrayExpression,
	isMemberExpression,
	isMethodCall,
	isNewExpression,
	isStringLiteral,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getParenthesizedText,
	isGlobalIdentifier,
	isParenthesized,
	isString,
	isTypeScriptExpressionWrapper,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {createTypeCheckers, nonTarget, target} from './utils/type-helpers.js';
import typedArrayTypes from './shared/typed-array.js';

const MESSAGE_ID_ERROR = 'prefer-uint8array-hex/error';
const MESSAGE_ID_SUGGESTION = 'prefer-uint8array-hex/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over {{description}}.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `{{replacement}}`.',
};

const bufferImportSources = new Set(['buffer', 'node:buffer']);
const globalObjectNames = new Set(['globalThis', 'window', 'self', 'global']);
const hexPairPatterns = new Set(['..', '.{2}', '.{1,2}', '[0-9a-f]{2}', String.raw`[\da-f]{2}`]);
const nonByteExpressionTypes = new Set([
	'ArrayExpression',
	'ArrowFunctionExpression',
	'BinaryExpression',
	'ClassExpression',
	'FunctionExpression',
	'Literal',
	'NewExpression',
	'ObjectExpression',
	'TemplateLiteral',
	'UnaryExpression',
	'UpdateExpression',
]);
const constructorNames = ['Array', ...typedArrayTypes];

// All matched operations are ordinary, non-computed calls with exact argument counts.
const isPlainMethodCall = (node, method, argumentsLength) => isMethodCall(node, {
	method,
	argumentsLength,
	computed: false,
	optionalCall: false,
	optionalMember: false,
});

const isLiteralValue = (node, value) => node?.type === 'Literal' && node.value === value;
const isHexEncoding = node => isStringLiteral(node) && node.value.toLowerCase() === 'hex';

function isBufferReference(node, context) {
	if (isMemberExpression(node, {property: 'Buffer', computed: false, optional: false})) {
		return globalObjectNames.has(node.object.name) && isGlobalIdentifier(node.object, context);
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	if (node.name === 'Buffer' && isGlobalIdentifier(node, context)) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition =>
		definition.type === 'ImportBinding'
		&& bufferImportSources.has(definition.parent.source.value)
		&& definition.node.type === 'ImportSpecifier'
		&& definition.node.imported.name === 'Buffer') ?? false;
}

const isConstructorReference = (node, context) => isBufferReference(node, context)
	|| (node.type === 'Identifier' && constructorNames.includes(node.name))
	|| (
		isMemberExpression(node, {properties: constructorNames, computed: false, optional: false})
		&& globalObjectNames.has(node.object.name)
		&& isGlobalIdentifier(node.object, context)
	);

const isBufferFactory = (node, context) =>
	isMethodCall(node, {
		methods: ['from', 'of', 'alloc', 'allocUnsafe', 'allocUnsafeSlow', 'concat', 'copyBytesFrom'],
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})
	&& isBufferReference(node.callee.object, context);

const isBufferExpression = (node, context) => isBufferFactory(node, context)
	|| (
		(isNewExpression(node) || isCallExpression(node, {optional: false}))
		&& isBufferReference(node.callee, context)
	);

const typeCheckerOptions = {
	checkClassHeritage: false,
	preferTypeReferenceDefinitions: true,
	targetTypeNames: new Set(['Buffer']),
	targetTypeImports: new Map([...bufferImportSources].map(source => [source, new Set(['Buffer'])])),
	nonTargetTypeNames: new Set(['Array', 'ReadonlyArray', ...typedArrayTypes]),
	isTargetNode: isBufferExpression,
	isNonTargetNode: (node, context) => nonByteExpressionTypes.has(node.type)
		|| isConstructorReference(node, context)
		|| isCallExpression(node, {name: 'Array'})
		|| isMethodCall(node, {objects: ['Array', ...typedArrayTypes], methods: ['from', 'of']})
		|| isMethodCall(node, {object: 'Uint8Array', methods: ['fromHex', 'fromBase64']}),
};
const decodingTypeCheckerOverrides = {
	getStaticType: () => nonTarget,
	isNonTargetNode: (node, context) => !(node.type === 'BinaryExpression' && node.operator === '+')
		&& typeCheckerOptions.isNonTargetNode(node, context),
};
const {getType: getBufferType} = createTypeCheckers(typeCheckerOptions);
const {getType: getByteArrayType} = createTypeCheckers({
	...typeCheckerOptions,
	targetTypeNames: new Set(['Buffer', 'Uint8Array']),
	targetConstructorNames: ['Uint8Array'],
	isTargetNode: (node, context) => isBufferExpression(node, context)
		|| isMethodCall(node, {
			object: 'Uint8Array',
			methods: ['from', 'of', 'fromHex', 'fromBase64'],
			computed: false,
			optionalCall: false,
			optionalMember: false,
		}),
});

const isKnownNonStringInput = (node, context) => {
	const type = getByteArrayType(node, context, decodingTypeCheckerOverrides);
	return type === target || (type === nonTarget && !isString(node, context));
};

function getCallback(node) {
	node = unwrapTypeScriptExpression(node);
	if (
		(node?.type !== 'ArrowFunctionExpression' && node?.type !== 'FunctionExpression')
		|| node.async
		|| node.generator
		|| node.params.length !== 1
		|| node.params[0].type !== 'Identifier'
	) {
		return;
	}

	let expression = node.body;
	if (expression.type === 'BlockStatement') {
		if (expression.body.length !== 1 || expression.body[0].type !== 'ReturnStatement' || !expression.body[0].argument) {
			return;
		}

		expression = expression.body[0].argument;
	}

	return {parameter: node.params[0], expression: unwrapTypeScriptExpression(expression)};
}

function isEncodingCallback(node) {
	const callback = getCallback(node);
	if (!callback) {
		return false;
	}

	const {parameter, expression} = callback;
	if (
		!isPlainMethodCall(expression, 'padStart', 2)
		|| !isLiteralValue(expression.arguments[0], 2)
		|| !isLiteralValue(expression.arguments[1], '0')
	) {
		return false;
	}

	const numberToString = expression.callee.object;
	return isPlainMethodCall(numberToString, 'toString', 1)
		&& isLiteralValue(numberToString.arguments[0], 16)
		&& numberToString.callee.object.type === 'Identifier'
		&& numberToString.callee.object.name === parameter.name;
}

function isDecodingCallback(node) {
	const callback = getCallback(node);
	if (!callback) {
		return false;
	}

	const {parameter, expression} = callback;
	return (
		isCallExpression(expression, {name: 'parseInt', argumentsLength: 2, optional: false})
		|| (isPlainMethodCall(expression, 'parseInt', 2) && expression.callee.object.name === 'Number')
	)
	&& expression.arguments[0].type === 'Identifier'
	&& expression.arguments[0].name === parameter.name
	&& isLiteralValue(expression.arguments[1], 16);
}

function getEncodingInput(node) {
	if (!isPlainMethodCall(node, 'join', 1) || !isLiteralValue(node.arguments[0], '')) {
		return;
	}

	const mapped = unwrapTypeScriptExpression(node.callee.object);
	if (isPlainMethodCall(mapped, 'from', 2) && mapped.callee.object.name === 'Array' && isEncodingCallback(mapped.arguments[1])) {
		return mapped.arguments[0];
	}

	if (!isPlainMethodCall(mapped, 'map', 1) || !isEncodingCallback(mapped.arguments[0])) {
		return;
	}

	const copied = unwrapTypeScriptExpression(mapped.callee.object);
	if (copied.type === 'ArrayExpression' && copied.elements.length === 1 && copied.elements[0]?.type === 'SpreadElement') {
		return copied.elements[0].argument;
	}

	if (isPlainMethodCall(copied, 'from', 1) && copied.callee.object.name === 'Array') {
		return copied.arguments[0];
	}
}

function getDecodingInput(node) {
	let pairs;
	let callback;
	if (isPlainMethodCall(node, 'from', 2) && node.callee.object.name === 'Uint8Array') {
		[pairs, callback] = node.arguments;
	} else if (
		isNewExpression(node, {name: 'Uint8Array', argumentsLength: 1})
		|| (isPlainMethodCall(node, 'from', 1) && node.callee.object.name === 'Uint8Array')
	) {
		const mapped = unwrapTypeScriptExpression(node.arguments[0]);
		if (!isPlainMethodCall(mapped, 'map', 1)) {
			return;
		}

		pairs = mapped.callee.object;
		[callback] = mapped.arguments;
	} else {
		return;
	}

	if (!isDecodingCallback(callback)) {
		return;
	}

	pairs = unwrapTypeScriptExpression(pairs);
	if (pairs.type === 'LogicalExpression' && ['??', '||'].includes(pairs.operator) && isEmptyArrayExpression(pairs.right)) {
		pairs = unwrapTypeScriptExpression(pairs.left);
	}

	if (!isPlainMethodCall(pairs, 'match', 1)) {
		return;
	}

	const {regex} = pairs.arguments[0];
	if (!regex || !hexPairPatterns.has(regex.pattern) || !regex.flags.includes('g') || /[^gisuv]/v.test(regex.flags)) {
		return;
	}

	return pairs.callee.object;
}

function isImmediatelyAccessed(node) {
	while (isTypeScriptExpressionWrapper(node.parent)) {
		node = node.parent;
	}

	return node.parent.type === 'MemberExpression' && node.parent.object === node;
}

function getProblem(node, input, context, {decoding = false, autofix = false, canSuggest = true} = {}) {
	if (input.type === 'Super') {
		return;
	}

	const replacement = decoding ? 'Uint8Array.fromHex()' : 'Uint8Array#toHex()';
	const problem = {
		node,
		messageId: MESSAGE_ID_ERROR,
		data: {replacement, description: decoding ? 'this hex decoding' : 'this hex encoding'},
	};

	function * fix(fixer, {abort}) {
		const {sourceCode} = context;
		if (sourceCode.getCommentsInside(node).length > 0) {
			abort();
		}

		// Preserve existing grouping, including parentheses that keep sequence expressions as a single argument.
		let inputText = getParenthesizedText(input, context);
		if (!decoding && shouldAddParenthesesToMemberExpressionObject(input, context) && !isParenthesized(input, context)) {
			inputText = `(${inputText})`;
		}

		let text = decoding ? `Uint8Array.fromHex(${inputText})` : `${inputText}.toHex()`;
		if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
			text = `;${text}`;
		}

		yield fixer.replaceText(node, text);
		yield fixSpaceAroundKeyword(fixer, node, context);
	}

	if (autofix) {
		problem.fix = fix;
	} else if (canSuggest) {
		problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, data: {replacement}, fix}];
	}

	return problem;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on(['CallExpression', 'NewExpression'], node => {
		const encodingInput = getEncodingInput(node);
		if (encodingInput && unwrapTypeScriptExpression(encodingInput).type !== 'ChainExpression') {
			const type = getByteArrayType(encodingInput, context);
			if (type !== nonTarget) {
				return getProblem(node, encodingInput, context, {autofix: type === target});
			}
		}

		if (isPlainMethodCall(node, 'toString', 1) && isHexEncoding(node.arguments[0])) {
			let input = node.callee.object;
			const type = getBufferType(input, context);
			if (type === nonTarget || unwrapTypeScriptExpression(input).type === 'ChainExpression') {
				return;
			}

			if (
				isPlainMethodCall(input, 'from', 1)
				&& isBufferReference(input.callee.object, context)
				&& getByteArrayType(input.arguments[0], context) === target
			) {
				[input] = input.arguments;
			}

			return getProblem(node, input, context, {autofix: type === target});
		}

		if (
			isPlainMethodCall(node, 'from', 2)
			&& isHexEncoding(node.arguments[1])
			&& isBufferReference(node.callee.object, context)
			&& !isKnownNonStringInput(node.arguments[0], context)
		) {
			return getProblem(node, node.arguments[0], context, {decoding: true, canSuggest: !isImmediatelyAccessed(node)});
		}

		const decodingInput = getDecodingInput(node);
		if (decodingInput && unwrapTypeScriptExpression(decodingInput).type !== 'ChainExpression') {
			return getProblem(node, decodingInput, context, {decoding: true});
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Uint8Array#toHex()` and `Uint8Array.fromHex()` over manual and Buffer hex conversions.',
			// eslint-disable-next-line no-warning-comments
			// TODO: Enable in the `recommended` and `unopinionated` configs when targeting Node.js 26.
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
