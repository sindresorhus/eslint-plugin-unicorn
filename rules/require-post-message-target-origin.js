import {isIdentifierNamed, isMemberExpression, isMethodCall} from './ast/index.js';
import {isGlobalIdentifier, unwrapTypeScriptExpression, withTypeInformation} from './utils/index.js';

const MESSAGE_ID = 'error';
const messages = {
	[MESSAGE_ID]: 'Missing the `targetOrigin` argument.',
};

function isWindowReceiver(receiver, context) {
	const node = unwrapTypeScriptExpression(receiver);
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

function getTargetOriginSupport(type) {
	const nonNullableType = type.getNonNullableType();
	// Inspect union members separately so TypeScript does not discard the Window overload with `targetOrigin` when combining signatures.
	const types = nonNullableType.isUnion() ? nonNullableType.types : [nonNullableType];
	const signatures = types.flatMap(type => type.getCallSignatures());
	if (signatures.length > 0) {
		return signatures.some(({parameters}) => parameters.some(({name}) => name === 'targetOrigin'));
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

		const hasTargetOrigin = withTypeInformation(node.callee, context, ({type}) => getTargetOriginSupport(type));
		if (!(hasTargetOrigin ?? isWindowReceiver(node.callee.object, context))) {
			return;
		}

		const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);

		return {
			loc: {
				start: sourceCode.getLoc(penultimateToken).end,
				end: sourceCode.getLoc(lastToken).end,
			},
			messageId: MESSAGE_ID,
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
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
