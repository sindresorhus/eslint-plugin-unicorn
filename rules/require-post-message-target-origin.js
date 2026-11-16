import {isIdentifierNamed, isMemberExpression, isMethodCall} from './ast/index.js';
import {appendArgument} from './fix/index.js';
import {
	getLinebreak,
	getLineIndent,
	getStaticPropertyName,
	isGlobalIdentifier,
	unwrapChainAndTypeScriptExpression,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

const MESSAGE_ID = 'error';
const OPTIONS_MESSAGE_ID = 'missing-option';
const SUGGESTION_ID = 'same-origin';
const SAME_ORIGIN = '\'/\'';
const messages = {
	[MESSAGE_ID]: 'Missing the `targetOrigin` argument.',
	[OPTIONS_MESSAGE_ID]: 'Missing the `targetOrigin` option.',
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

function getReportKind({type, program}, hasOptions) {
	const nonNullableType = type.getNonNullableType();
	// Inspect union members separately so TypeScript does not discard the Window overload with `targetOrigin` when combining signatures.
	const types = nonNullableType.isUnion() ? nonNullableType.types : [nonNullableType];
	const signatureLists = types.map(type => type.getCallSignatures());

	if (signatureLists.every(signatures => !hasTargetOriginSignature(signatures))) {
		return signatureLists.every(signatures => signatures.length === 0) ? undefined : 'ignore';
	}

	const isStandardLibraryMethod = signatureLists.every(signatures =>
		signatures.length > 0 && signatures.every(signature => {
			const declaration = signature.getDeclaration();
			return declaration && program.isSourceFileDefaultLibrary(declaration.getSourceFile());
		}));

	// A custom overload can interpret an object as its positional targetOrigin.
	if (hasOptions && !isStandardLibraryMethod) {
		return 'ignore';
	}

	return isStandardLibraryMethod && signatureLists.every(signatures => hasTargetOriginSignature(signatures)) ? 'suggest' : 'report';
}

function getOptionsWithoutTargetOrigin(argument, context) {
	const options = unwrapTypeScriptExpression(argument);
	if (options?.type !== 'ObjectExpression') {
		return;
	}

	for (const property of options.properties) {
		if (property.type !== 'Property') {
			return;
		}

		const name = getStaticPropertyName(property, context);
		if ([undefined, 'targetOrigin', '__proto__'].includes(name)) {
			return;
		}
	}

	return options;
}

function addTargetOriginOption(fixer, options, context) {
	const {sourceCode} = context;
	const openingBrace = sourceCode.getFirstToken(options);
	const firstToken = sourceCode.getTokenAfter(openingBrace, {includeComments: true});
	const property = `targetOrigin: ${SAME_ORIGIN}`;

	if (firstToken === sourceCode.getLastToken(options)) {
		return fixer.replaceText(options, `{${property}}`);
	}

	const separator = sourceCode.getLoc(openingBrace).end.line === sourceCode.getLoc(firstToken).start.line
		? ' '
		: getLinebreak(context) + getLineIndent(firstToken, context);
	const comma = options.properties.length > 0 ? ',' : '';
	return fixer.insertTextBefore(firstToken, property + comma + separator);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
function create(context) {
	const {sourceCode} = context;
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'postMessage',
			minimumArguments: 1,
			maximumArguments: 2,
		})) {
			return;
		}

		const optionsArgument = node.arguments[1];
		const options = optionsArgument && getOptionsWithoutTargetOrigin(optionsArgument, context);
		if (optionsArgument && !options) {
			return;
		}

		const reportKind = withTypeInformation(node.callee, context, typeInformation => getReportKind(typeInformation, Boolean(options)))
			?? (isWindowReceiver(node.callee.object, context) ? 'suggest' : 'ignore');
		if (reportKind === 'ignore') {
			return;
		}

		const fix = options
			? fixer => addTargetOriginOption(fixer, options, context)
			: fixer => appendArgument(fixer, node, SAME_ORIGIN, context);
		// A TypeScript wrapper can restrict the properties the options object accepts.
		const suggest = reportKind === 'suggest' && options === optionsArgument ? [{messageId: SUGGESTION_ID, fix}] : undefined;

		if (options) {
			return {node: options, messageId: OPTIONS_MESSAGE_ID, suggest};
		}

		const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);

		return {
			loc: {
				start: sourceCode.getLoc(penultimateToken).end,
				end: sourceCode.getLoc(lastToken).end,
			},
			messageId: MESSAGE_ID,
			suggest,
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
