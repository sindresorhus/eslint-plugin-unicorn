import {isIdentifierNamed, isMemberExpression, isMethodCall} from './ast/index.js';
import {appendArgument} from './fix/index.js';
import {isGlobalIdentifier, unwrapChainAndTypeScriptExpression, withTypeInformation} from './utils/index.js';

const MESSAGE_ID = 'error';
const SUGGESTION_ID = 'same-origin';
const messages = {
	[MESSAGE_ID]: 'Missing the `targetOrigin` argument.',
	[SUGGESTION_ID]: 'Use `\'/\'` for explicit same-origin delivery.',
};

function isWindowReceiver(receiver, context) {
	const node = unwrapChainAndTypeScriptExpression(receiver);
	if (isIdentifierNamed(node, 'window')) {
		return isGlobalIdentifier(node, context);
	}

	if (isMemberExpression(node, 'contentWindow')) {
		return true;
	}

	return (
		isMemberExpression(node, {object: 'document', property: 'defaultView'})
		|| isMemberExpression(node, {object: 'window', properties: ['parent', 'top', 'opener']})
	) && isGlobalIdentifier(node.object, context);
}

const hasTargetOriginSignature = signatures => signatures.some(({parameters}) => parameters[1]?.name === 'targetOrigin');

function getReportKind({type, program}) {
	const nonNullableType = type.getNonNullableType();
	// Inspect union members separately so TypeScript does not discard the Window overload with `targetOrigin` when combining signatures.
	const types = nonNullableType.isUnion() ? nonNullableType.types : [nonNullableType];
	const signatureLists = types.map(type => type.getCallSignatures());

	if (signatureLists.some(signatures => hasTargetOriginSignature(signatures))) {
		const canSuggest = signatureLists.every(signatures => hasTargetOriginSignature(signatures))
			&& signatureLists.flat().every(signature => {
				const declaration = signature.getDeclaration();
				return declaration && program.isSourceFileDefaultLibrary(declaration.getSourceFile());
			});

		return canSuggest ? 'suggest' : 'report';
	}

	if (signatureLists.some(signatures => signatures.length > 0)) {
		return 'ignore';
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
function create(context) {
	const {sourceCode} = context;
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'postMessage',
			argumentsLength: 1,
		})) {
			return;
		}

		const reportKind = withTypeInformation(node.callee, context, getReportKind)
			?? (isWindowReceiver(node.callee.object, context) ? 'suggest' : 'ignore');
		if (reportKind === 'ignore') {
			return;
		}

		const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);

		return {
			loc: {
				start: sourceCode.getLoc(penultimateToken).end,
				end: sourceCode.getLoc(lastToken).end,
			},
			messageId: MESSAGE_ID,
			suggest: reportKind === 'suggest'
				? [{
					messageId: SUGGESTION_ID,
					fix: fixer => appendArgument(fixer, node, '\'/\'', context),
				}]
				: undefined,
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
			// Turned off because requiring an explicit target origin is a convention. The default already limits delivery to the same origin.
			// See #1396 for the history of ambiguous receivers.
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
