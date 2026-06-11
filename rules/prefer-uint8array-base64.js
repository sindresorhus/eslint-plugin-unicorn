import {findVariable} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import {isStringLiteral, isMethodCall, isMemberExpression} from './ast/index.js';
import {isGlobalIdentifier} from './utils/index.js';
import {removeArgument} from './fix/index.js';

const MESSAGE_ID_ERROR = 'prefer-uint8array-base64/error';
const MESSAGE_ID_SUGGESTION = 'prefer-uint8array-base64/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const base64Encodings = new Set(['base64', 'base64url']);
const bufferImportSources = new Set(['buffer', 'node:buffer']);
const globalObjectNames = new Set(['globalThis', 'window', 'self', 'global']);

const isBase64EncodingArgument = node => isStringLiteral(node) && base64Encodings.has(node.value);

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
	// Resolving and inspecting the receiver's type can crash deep inside TypeScript 6 while it computes
	// module specifiers for symbols declared in other modules (`Cannot read properties of undefined (reading 'includes')`).
	// We cannot then confirm the receiver is byte-like, so we conservatively skip reporting rather than crash the lint run.
	try {
		const type = parserServices.getTypeAtLocation(node);

		const parts = type.isUnion() || type.isIntersection() ? type.types : [type];
		return parts.some(part => {
			// `intrinsicName` exposes `any`/`unknown` without `typeChecker.typeToString()`, which is one of the calls that crashes.
			const name = (part.getSymbol() ?? part.aliasSymbol)?.getName();
			return name === 'Buffer' || name === 'Uint8Array' || part.intrinsicName === 'any' || part.intrinsicName === 'unknown';
		});
	} catch {
		return false;
	}
}

// Whether `node` (the object of a `.from()` call) refers to the `Buffer` constructor, as a global, `globalThis.Buffer`, or an import.
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	tracker.listen({context});

	context.on('CallExpression', node => {
		// `Buffer.from(string, 'base64' | 'base64url')`
		// Match exactly two arguments. With a string input, `Buffer.from` ignores any third argument, but `Uint8Array.fromBase64`'s second parameter is an options object, so shifting an extra argument into it would change behavior or throw.
		if (
			isMethodCall(node, {method: 'from', argumentsLength: 2, computed: false})
			&& isBase64EncodingArgument(node.arguments[1])
			&& isBufferReference(node.callee.object, context)
		) {
			const encodingNode = node.arguments[1];

			const problem = {
				node: node.callee,
				messageId: MESSAGE_ID_ERROR,
				data: {value: `Buffer.from(…, '${encodingNode.value}')`, replacement: 'Uint8Array.fromBase64()'},
			};

			// When the result is immediately used through a member access, for example `Buffer.from(string, 'base64').toString()`, the suggestion would rewrite only the constructor and leave the chained `Buffer` method on a plain `Uint8Array`, which behaves differently (`Uint8Array#toString()` returns a comma-joined byte list, not the decoded string). Skip the suggestion then, but still report the preference.
			const isChained = node.parent.type === 'MemberExpression' && node.parent.object === node;
			if (!isChained) {
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

							yield encodingNode.value === 'base64url'
								? fixer.replaceText(encodingNode, '{alphabet: \'base64url\'}')
								: removeArgument(fixer, encodingNode, context);
						},
					},
				];
			}

			return problem;
		}

		// `buffer.toString('base64' | 'base64url')`
		if (
			isMethodCall(node, {method: 'toString', minimumArguments: 1, computed: false})
			&& isBase64EncodingArgument(node.arguments[0])
			&& (!sourceCode.parserServices?.program || isByteLikeReceiver(node.callee.object, sourceCode.parserServices))
		) {
			const [encodingNode] = node.arguments;

			return {
				node: node.callee.property,
				messageId: MESSAGE_ID_ERROR,
				data: {value: `toString('${encodingNode.value}')`, replacement: 'Uint8Array#toBase64()'},
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Uint8Array#toBase64()` and `Uint8Array.fromBase64()` over `atob()`, `btoa()`, and `Buffer` base64 conversions.',
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
