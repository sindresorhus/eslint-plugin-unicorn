import {isMemberExpression, isNewExpression} from './ast/index.js';
import {
	getParenthesizedRange,
	getParenthesizedText,
	getStaticValueForControlFlow,
	needsSemicolon,
	getMemberExpressionObjectText,
	isInUnparenthesizedNewExpressionCallee,
	shouldAddParenthesesToMemberExpressionObject,
	shouldAddParenthesesToNewExpressionCallee,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';
import {createBuiltinTypeCheckers} from './utils/type-helpers.js';

const MESSAGE_ID = 'no-url-in-search-params';
const MESSAGE_ID_PARSE = 'parse-url';
const MESSAGE_ID_COPY = 'detached-copy';
const MESSAGE_ID_LIVE = 'live-search-params';
const messages = {
	[MESSAGE_ID]: '`URLSearchParams` does not parse full URLs.',
	[MESSAGE_ID_PARSE]: 'Parse the URL and use its `searchParams`.',
	[MESSAGE_ID_COPY]: 'Construct a detached copy from the URL\'s query string.',
	[MESSAGE_ID_LIVE]: 'Use the URL\'s live `searchParams` (mutations update the URL).',
};

const {isTarget: isUrl} = createBuiltinTypeCheckers({
	name: 'URL',
	checkClassHeritage: false,
	preferTypeReferenceDefinitions: true,
	targetTypeImports: new Map([
		['node:url', new Set(['URL'])],
		['url', new Set(['URL'])],
	]),
});

/**
Check for the common browser location expressions.
*/
const isLocation = node => {
	node = unwrapTypeScriptExpression(node);
	return (node.type === 'Identifier' && node.name === 'location')
		|| isMemberExpression(node, {
			objects: ['window', 'globalThis', 'document', 'self'],
			property: 'location',
			optional: false,
		});
};

/**
Get access to the URL's search parameters, protecting statement boundaries.
*/
const getSearchParametersText = (receiver, node, context) => {
	let text = `${getMemberExpressionObjectText(receiver, context, node)}.searchParams`;
	if (
		isInUnparenthesizedNewExpressionCallee(node, context)
		&& !shouldAddParenthesesToMemberExpressionObject(receiver, context, node)
		&& shouldAddParenthesesToNewExpressionCallee({type: 'MemberExpression', object: receiver}, context)
	) {
		text = `(${text})`;
	}

	return needsSemicolon(context.sourceCode.getTokenBefore(node), context, text) ? `;${text}` : text;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', node => {
		if (!isNewExpression(node, {name: 'URLSearchParams', argumentsLength: 1})) {
			return;
		}

		const [argument] = node.arguments;
		const expression = unwrapTypeScriptExpression(argument);
		const problem = {node: argument, messageId: MESSAGE_ID};
		const hasCommentsOutsideArgument = wouldRemoveComments(context, node, [getParenthesizedRange(argument, context)]);

		if (isUrl(argument, context)) {
			if (!hasCommentsOutsideArgument) {
				const receiverText = getMemberExpressionObjectText(argument, context);
				problem.suggest = [{
					messageId: MESSAGE_ID_COPY,
					fix: fixer => fixer.replaceText(node, `new URLSearchParams(${receiverText}.search)`),
				}, {
					messageId: MESSAGE_ID_LIVE,
					fix: fixer => fixer.replaceText(node, getSearchParametersText(argument, node, context)),
				}];
			}

			return problem;
		}

		if (isMemberExpression(expression, {property: 'href', optional: false})) {
			const receiver = expression.object;
			const receiverIsUrl = isUrl(receiver, context);
			if (!receiverIsUrl && !isLocation(receiver)) {
				return;
			}

			problem.suggest = [{
				messageId: MESSAGE_ID_COPY,
				fix: fixer => fixer.replaceText(expression.property, 'search'),
			}];
			if (receiverIsUrl && !wouldRemoveComments(context, node, [getParenthesizedRange(receiver, context)])) {
				problem.suggest.push({
					messageId: MESSAGE_ID_LIVE,
					fix: fixer => fixer.replaceText(node, getSearchParametersText(receiver, node, context)),
				});
			}

			return problem;
		}

		const value = getStaticValueForControlFlow(argument, context)?.value;
		if (typeof value !== 'string' || !/^[a-z][\d+\-.a-z]*:\/\//i.test(value.trim()) || !URL.canParse(value)) {
			return;
		}

		if (!hasCommentsOutsideArgument) {
			problem.suggest = [{
				messageId: MESSAGE_ID_PARSE,
				fix: fixer => fixer.replaceText(node, `new URL(${getParenthesizedText(argument, context)}).searchParams`),
			}];
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow passing full URLs to `URLSearchParams`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
