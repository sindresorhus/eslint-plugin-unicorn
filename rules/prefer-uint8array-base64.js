import {findVariable} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import {
	isStringLiteral,
	isRegexLiteral,
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';
import {
	getTypeSymbol,
	isGlobalIdentifier,
	isKnownNonString,
	isNullishType,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {removeArgument, removeMethodCall} from './fix/index.js';

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

const getBase64Encoding = node => {
	if (!isStringLiteral(node)) {
		return;
	}

	const encoding = node.value.toLowerCase();
	return base64Encodings.has(encoding) ? encoding : undefined;
};

// Whether the identifier is bound to `Buffer` imported from `'buffer'` / `'node:buffer'`, as `import {Buffer} from …` or `import {Buffer as foo} from …`. The default import is intentionally not matched, since it is the module namespace, not the `Buffer` constructor.
function isImportedBuffer(identifier, context) {
	const variable = findVariable(context.sourceCode.getScope(identifier), identifier);

	return variable?.defs.some(definition => {
		if (definition.type !== 'ImportBinding' || !bufferImportSources.has(definition.parent.source.value)) {
			return false;
		}

		const specifier = definition.node;
		return specifier.type === 'ImportSpecifier' && specifier.imported.name === 'Buffer';
	}) ?? false;
}

// Whether the receiver of a `.toString('base64')` call is byte-like (`Buffer`/`Uint8Array`). Only consulted when type information is available; without it, callers should report anyway, since requiring type information would make the rule too narrow. With type information, a receiver whose type is known and not byte-like (for example a userland object with a custom `toString`) is skipped to avoid false positives. `any`/`unknown` types are treated as byte-like, since we cannot rule them out.
function isByteLikeReceiver(node, parserServices) {
	// Resolving and inspecting the receiver's type can crash deep inside TypeScript 6 while it computes module specifiers for symbols declared in other modules (`Cannot read properties of undefined (reading 'includes')`). We cannot then confirm the receiver is byte-like, so we conservatively skip reporting rather than crash the lint run.
	try {
		const type = parserServices.getTypeAtLocation(node);
		const isByteLikeType = type => {
			// `intrinsicName` exposes `any`/`unknown` without `typeChecker.typeToString()`, which is one of the calls that crashes.
			const name = getTypeSymbol(type)?.getName();
			return name === 'Buffer' || name === 'Uint8Array' || type.intrinsicName === 'any' || type.intrinsicName === 'unknown';
		};

		if (type.isUnion()) {
			const nonNullishTypes = type.types.filter(type => !isNullishType(type));
			return nonNullishTypes.length > 0 && nonNullishTypes.every(type => isByteLikeType(type));
		}

		return type.isIntersection() ? type.types.some(type => isByteLikeType(type)) : isByteLikeType(type);
	} catch {
		return false;
	}
}

function isChainedExpression(node) {
	let expression = node;
	while (
		(expression.parent.type === 'ChainExpression' || isTypeScriptExpressionWrapper(expression.parent))
		&& expression.parent.expression === expression
	) {
		expression = expression.parent;
	}

	return expression.parent.type === 'MemberExpression' && expression.parent.object === expression;
}

// Whether `node` (the object of a `.from()` call) refers to the `Buffer` constructor, as a global, `globalThis.Buffer`, or an import.
function isBufferReference(node, context) {
	const reference = unwrapTypeScriptExpression(node);
	if (isMemberExpression(reference, {property: 'Buffer', computed: false})) {
		const object = unwrapTypeScriptExpression(reference.object);
		return globalObjectNames.has(object.name) && isGlobalIdentifier(object, context);
	}

	if (reference.type !== 'Identifier') {
		return false;
	}

	return (reference.name === 'Buffer' && isGlobalIdentifier(reference, context))
		|| isImportedBuffer(reference, context);
}

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
			&& node.arguments[0].type !== 'ArrayExpression'
			&& !isKnownNonString(node.arguments[0], context)
			&& isBufferReference(node.callee.object, context)
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
			isMethodCall(node, {method: 'toString', minimumArguments: 1, computed: false})
			&& toStringEncoding
			&& (!sourceCode.parserServices?.program || isByteLikeReceiver(node.callee.object, sourceCode.parserServices))
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
