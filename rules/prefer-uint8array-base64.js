import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import {
	isCallExpression,
	isStringLiteral,
	isRegexLiteral,
	isMethodCall,
	isMemberExpression,
	isNewExpression,
} from './ast/index.js';
import {
	isGlobalIdentifier,
	isString,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	createTypeCheckers,
	nonTarget,
	nullish,
	target,
} from './utils/type-helpers.js';
import {removeArgument, removeMethodCall} from './fix/index.js';
import typedArrayTypes from './shared/typed-array.js';

const MESSAGE_ID_OPTIONS = 'prefer-uint8array-base64/options';
const MESSAGE_ID_ERROR = 'prefer-uint8array-base64/error';
const MESSAGE_ID_SUGGESTION = 'prefer-uint8array-base64/suggestion';
const messages = {
	[MESSAGE_ID_OPTIONS]: 'Prefer native `toBase64()` options over manual base64 postprocessing.',
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const base64Encodings = new Set(['base64', 'base64url']);
const bufferImportSources = new Set(['buffer', 'node:buffer']);
const globalObjectNames = new Set(['globalThis', 'window', 'self', 'global']);
const transparentExpressionTypes = new Set(['AwaitExpression', 'ChainExpression', 'ParenthesizedExpression']);
const arrayBufferTypes = ['ArrayBuffer', 'SharedArrayBuffer', 'DataView'];
const nonBufferExpressionTypes = new Set([
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
const constructorNames = ['Array', ...arrayBufferTypes, ...typedArrayTypes];
const bufferTypeImports = new Map([...bufferImportSources].map(source => [source, new Set(['Buffer'])]));

const getBase64Encoding = node => {
	if (!isStringLiteral(node)) {
		return;
	}

	const encoding = node.value.toLowerCase();
	return base64Encodings.has(encoding) ? encoding : undefined;
};

function getBufferImportSpecifier(identifier, context) {
	if (identifier.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(identifier), identifier);
	const [definition] = variable?.defs ?? [];
	if (
		variable?.defs.length !== 1
		|| definition.type !== 'ImportBinding'
		|| definition.parent.type !== 'ImportDeclaration'
		|| !bufferImportSources.has(definition.parent.source.value)
	) {
		return;
	}

	return definition.node;
}

const isBufferModuleObjectImport = specifier =>
	specifier?.type === 'ImportNamespaceSpecifier'
	|| specifier?.type === 'ImportDefaultSpecifier';

function unwrapTransparentExpression(node) {
	node = unwrapTypeScriptExpression(node);
	while (transparentExpressionTypes.has(node?.type)) {
		node = unwrapTypeScriptExpression(node.type === 'AwaitExpression' ? node.argument : node.expression);
	}

	return node;
}

function isDerivedFromBase64String(node) {
	while (isMethodCall(node = unwrapTransparentExpression(node))) {
		if (getPropertyName(node.callee) === 'toBase64') {
			return true;
		}

		node = node.callee.object;
	}

	return false;
}

function isBase64StringExpression(node) {
	node = unwrapTransparentExpression(node);
	while (getBase64Transformation(node)) {
		node = unwrapTransparentExpression(node.callee.object);
	}

	return isMethodCall(node) && getPropertyName(node.callee) === 'toBase64';
}

function isKnownStringExpression(node, context) {
	if (isString(node, context)) {
		return true;
	}

	if (isTypeScriptExpressionWrapper(node)) {
		const type = getBufferType(node, context);
		if (type === target || type === nonTarget) {
			return false;
		}

		return isKnownStringExpression(node.expression, context);
	}

	if (transparentExpressionTypes.has(node.type)) {
		return isKnownStringExpression(node.type === 'AwaitExpression' ? node.argument : node.expression, context);
	}

	return isBase64StringExpression(node)
		|| (
			node.type === 'LogicalExpression'
			&& isKnownStringExpression(node.left, context)
			&& isKnownStringExpression(node.right, context)
		);
}

function shouldIgnoreBufferFromInput(node, context) {
	if (isKnownStringExpression(node, context)) {
		return false;
	}

	if (isDerivedFromBase64String(node)) {
		return true;
	}

	if (isTypeScriptExpressionWrapper(node)) {
		const type = getBufferType(node, context, bufferInputTypeCheckerOverrides);
		return type === target || type === nonTarget || shouldIgnoreBufferFromInput(node.expression, context);
	}

	if (transparentExpressionTypes.has(node.type)) {
		return shouldIgnoreBufferFromInput(node.type === 'AwaitExpression' ? node.argument : node.expression, context);
	}

	if (node.type === 'LogicalExpression' || node.type === 'ConditionalExpression') {
		const expressions = node.type === 'LogicalExpression' ? [node.left, node.right] : [node.consequent, node.alternate];
		return expressions.some(expression => shouldIgnoreBufferFromInput(expression, context));
	}

	const type = getBufferType(node, context, bufferInputTypeCheckerOverrides);
	return type === target || type === nonTarget;
}

const isKnownNonBufferReceiver = (node, context) => getBufferType(node, context) === nonTarget
	|| isKnownStringExpression(node, context)
	|| isDerivedFromBase64String(node);

const isTransparentWrapperOf = (parent, expression) =>
	(
		(parent.type === 'ChainExpression' || isTypeScriptExpressionWrapper(parent))
		&& parent.expression === expression
	)
	|| (parent.type === 'AwaitExpression' && parent.argument === expression);

function isChainedExpression(node) {
	let expression = node;
	while (isTransparentWrapperOf(expression.parent, expression)) {
		expression = expression.parent;
	}

	return expression.parent.type === 'MemberExpression' && expression.parent.object === expression;
}

// Whether `node` refers to the `Buffer` constructor, as a global, `globalThis.Buffer`, or an import.
function isBufferReference(node, context) {
	const reference = unwrapTypeScriptExpression(node);
	if (isMemberExpression(reference, {property: 'Buffer', computed: false})) {
		const object = unwrapTypeScriptExpression(reference.object);
		const specifier = getBufferImportSpecifier(object, context);
		return (globalObjectNames.has(object.name) && isGlobalIdentifier(object, context))
			|| isBufferModuleObjectImport(specifier);
	}

	if (reference.type !== 'Identifier') {
		return false;
	}

	const specifier = getBufferImportSpecifier(reference, context);
	return (reference.name === 'Buffer' && isGlobalIdentifier(reference, context))
		|| (specifier?.type === 'ImportSpecifier' && specifier.imported.name === 'Buffer');
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

const bufferTypeCheckerOptions = {
	allowNullishInMixedUnion: true,
	checkClassHeritage: false,
	getStaticType: value => value === null || value === undefined ? nullish : nonTarget,
	preferTypeReferenceDefinitions: false,
	treatMixedUnionAsNonTarget: true,
	targetTypeNames: new Set(['Buffer']),
	targetTypeImports: bufferTypeImports,
	targetTypeNamespaceImports: bufferTypeImports,
	nonTargetTypeNames: new Set(['Array', 'ReadonlyArray', ...arrayBufferTypes, ...typedArrayTypes]),
	isTargetNode: isBufferExpression,
	isNonTargetNode: (node, context) => nonBufferExpressionTypes.has(node.type)
		|| isConstructorReference(node, context)
		|| isCallExpression(node, {name: 'Array'})
		|| isMethodCall(node, {objects: ['Array', ...typedArrayTypes], methods: ['from', 'of']})
		|| isMethodCall(node, {object: 'Uint8Array', methods: ['fromHex', 'fromBase64']}),
};
const bufferInputTypeCheckerOverrides = {
	isNonTargetNode: (node, context) => !(node.type === 'BinaryExpression' && node.operator === '+')
		&& bufferTypeCheckerOptions.isNonTargetNode(node, context),
};
const {getType: getBufferType} = createTypeCheckers(bufferTypeCheckerOptions);

function getBase64Transformation(node) {
	if (!isMethodCall(node, {
		methods: ['replace', 'replaceAll'],
		argumentsLength: 2,
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const [search, replacement] = node.arguments;
	if (!isStringLiteral(replacement)) {
		return;
	}

	const isReplaceAll = node.callee.property.name === 'replaceAll';
	let character;
	if (isReplaceAll && isStringLiteral(search)) {
		character = search.value;
	} else if (isRegexLiteral(search)) {
		const {pattern, flags} = search.regex;
		const isGlobal = flags.includes('g');
		const isSticky = flags.includes('y');
		if (isGlobal && !isSticky) {
			if (pattern === String.raw`\+`) {
				character = '+';
			} else if (pattern === String.raw`\/`) {
				character = '/';
			}
		}

		if (pattern === '=+$' && !isSticky && (isGlobal || !isReplaceAll)) {
			character = '=';
		}
	}

	if (
		(character === '+' && replacement.value === '-')
		|| (character === '/' && replacement.value === '_')
		|| (character === '=' && replacement.value === '')
	) {
		return character;
	}
}

function getBase64OptionsProblem(node, context) {
	if (!isMethodCall(node, {
		method: 'toBase64',
		argumentsLength: 0,
		computed: false,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const transformations = new Set();
	const calls = [];
	let outermostCall = node;
	while (outermostCall.parent.type === 'MemberExpression' && outermostCall.parent.object === outermostCall) {
		const call = outermostCall.parent.parent;
		const transformation = getBase64Transformation(call);
		if (!transformation) {
			break;
		}

		if (transformations.has(transformation)) {
			return;
		}

		transformations.add(transformation);
		calls.push(call);
		outermostCall = call;
	}

	if (calls.length === 0 || transformations.has('+') !== transformations.has('/')) {
		return;
	}

	const options = [];
	if (transformations.has('+')) {
		options.push('alphabet: \'base64url\'');
	}

	if (transformations.has('=')) {
		options.push('omitPadding: true');
	}

	return {
		node: outermostCall,
		messageId: MESSAGE_ID_OPTIONS,
		* fix(fixer, {abort}) {
			if (context.sourceCode.getCommentsInside(outermostCall).length > 0) {
				abort();
			}

			yield fixer.insertTextBefore(context.sourceCode.getLastToken(node), `{${options.join(', ')}}`);
			for (const call of calls) {
				yield removeMethodCall(fixer, call, context);
			}
		},
	};
}

const tracker = new GlobalReferenceTracker({
	objects: ['atob', 'btoa'],
	type: GlobalReferenceTracker.CALL,
	handle({node, path}) {
		const name = path.join('.');
		return {
			node: node.callee,
			messageId: MESSAGE_ID_ERROR,
			data: {
				value: `${name}()`,
				replacement: name === 'atob' ? 'Uint8Array.fromBase64()' : 'Uint8Array#toBase64()',
			},
		};
	},
});

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	tracker.listen({context});

	context.on('CallExpression', node => {
		const optionsProblem = getBase64OptionsProblem(node, context);
		if (optionsProblem) {
			return optionsProblem;
		}

		// `Buffer.from(string, 'base64' | 'base64url')`
		// Match exactly two arguments. With a string input, `Buffer.from` ignores any third argument, but `Uint8Array.fromBase64`'s second parameter is an options object, so shifting an extra argument into it would change behavior or throw.
		const bufferFromEncoding = getBase64Encoding(node.arguments[1]);
		if (
			isMethodCall(node, {method: 'from', argumentsLength: 2, computed: false})
			&& bufferFromEncoding
			&& isBufferReference(node.callee.object, context)
			&& !shouldIgnoreBufferFromInput(node.arguments[0], context)
		) {
			const encodingNode = node.arguments[1];

			const problem = {
				node: node.callee,
				messageId: MESSAGE_ID_ERROR,
				data: {value: `Buffer.from(…, '${encodingNode.value}')`, replacement: 'Uint8Array.fromBase64()'},
			};

			// When the result is immediately used through a member access, for example `Buffer.from(string, 'base64').toString()`, the suggestion would rewrite only the constructor and leave the chained `Buffer` method on a plain `Uint8Array`, which behaves differently (`Uint8Array#toString()` returns a comma-joined byte list, not the decoded string). Skip the suggestion then, but still report the preference.
			if (!node.optional && !node.callee.optional && !isChainedExpression(node)) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {value: 'Buffer.from()', replacement: 'Uint8Array.fromBase64()'},
						* fix(fixer, {abort}) {
							// `Buffer.from()` returns a `Buffer`, but `Uint8Array.fromBase64()` returns a plain `Uint8Array`, so the rewrite can change behavior. Keep it as a suggestion and bail when comments would be dropped.
							if (sourceCode.getCommentsInside(node).length > 0) {
								abort();
							}

							yield fixer.replaceText(node.callee, 'Uint8Array.fromBase64');

							yield bufferFromEncoding === 'base64url'
								? fixer.replaceText(encodingNode, '{alphabet: \'base64url\'}')
								: removeArgument(fixer, encodingNode, context);
						},
					},
				];
			}

			return problem;
		}

		// `buffer.toString('base64' | 'base64url')`
		const toStringEncoding = getBase64Encoding(node.arguments[0]);
		if (
			isMethodCall(node, {method: 'toString', argumentsLength: 1, computed: false})
			&& toStringEncoding
			&& !isKnownNonBufferReceiver(node.callee.object, context)
		) {
			const [encodingNode] = node.arguments;

			return {
				node: node.callee.property,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: `toString('${encodingNode.value}')`,
					replacement: toStringEncoding === 'base64url' ? 'Uint8Array#toBase64({alphabet: \'base64url\', omitPadding: true})' : 'Uint8Array#toBase64()',
				},
			};
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
			description: 'Prefer `Uint8Array#toBase64()` and `Uint8Array.fromBase64()` over legacy base64 conversions and manual postprocessing.',
			// eslint-disable-next-line no-warning-comments
			// TODO: Enable in the `recommended` and `unopinionated` configs when targeting Node.js 26.
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
