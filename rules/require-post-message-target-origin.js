import {isMethodCall} from './ast/index.js';
import {appendArgument} from './fix/index.js';
import {withTypeInformation} from './utils/index.js';

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Missing the `targetOrigin` argument.',
	[SUGGESTION]: 'Use `{{code}}`.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
function create(context) {
	const {sourceCode} = context;
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'postMessage',
			argumentsLength: 1,
			optionalCall: false,
		})) {
			return;
		}

		if (withTypeInformation(node.callee, context, ({type}) => {
			const nonNullableType = type.getNonNullableType();
			// Inspect union members separately so TypeScript does not discard the Window overload with `targetOrigin` when combining signatures.
			const types = nonNullableType.isUnion() ? nonNullableType.types : [nonNullableType];
			const signatureLists = types.map(type => type.getCallSignatures());
			return signatureLists.every(signatures => signatures.length > 0)
				&& signatureLists.flat().every(({parameters}) => parameters.every(({name}) => name !== 'targetOrigin'));
		})) {
			return;
		}

		const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
		const replacements = [];
		const target = node.callee.object;
		if (target.type === 'Identifier') {
			const {name} = target;

			replacements.push(`${name}.location.origin`);

			if (!['self', 'window', 'globalThis'].includes(name)) {
				replacements.push('self.location.origin');
			}
		} else {
			replacements.push('self.location.origin');
		}

		replacements.push('\'*\'');

		return {
			loc: {
				start: sourceCode.getLoc(penultimateToken).end,
				end: sourceCode.getLoc(lastToken).end,
			},
			messageId: ERROR,
			suggest: replacements.map(code => ({
				messageId: SUGGESTION,
				data: {code},
				/**
				@param {import('eslint').Rule.RuleFixer} fixer
				*/
				fix: fixer => appendArgument(fixer, node, code, context),
			})),
		};
	});
}

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce using the `targetOrigin` argument with `window.postMessage()`.',
			// Turned off because without type information we can't distinguish `window.postMessage` and `{Worker,MessagePort,Client,BroadcastChannel}#postMessage()`
			// See #1396
			recommended: false,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
