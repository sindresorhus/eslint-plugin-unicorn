import {
	ident,
	lexer,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';
import {
	getStaticStringValue,
	isMemberExpression,
	isMethodCall,
	isUndefined,
} from './ast/index.js';
import {appendArgument} from './fix/index.js';
import {escapeString, getStaticValueForControlFlow, unwrapTypeScriptExpression} from './utils/index.js';
import {createTypeCheckers, nonTarget, target} from './utils/type-helpers.js';

const MESSAGE_ID_PROPERTY = 'no-invalid-style-set-property/property';
const MESSAGE_ID_VALUE = 'no-invalid-style-set-property/value';
const MESSAGE_ID_PRIORITY = 'no-invalid-style-set-property/priority';
const MESSAGE_ID_REPLACE = 'no-invalid-style-set-property/replace';
const MESSAGE_ID_MOVE_IMPORTANT = 'no-invalid-style-set-property/move-important';
const messages = {
	[MESSAGE_ID_PROPERTY]: 'Use the CSS property name `{{replacement}}` instead of `{{property}}` in `setProperty()`.',
	[MESSAGE_ID_VALUE]: 'Pass `important` as the priority argument instead of including `!important` in the value.',
	[MESSAGE_ID_PRIORITY]: 'The `setProperty()` priority must be an empty string or `important` (case-insensitive).',
	[MESSAGE_ID_REPLACE]: 'Replace with `{{replacement}}`.',
	[MESSAGE_ID_MOVE_IMPORTANT]: 'Move `!important` to the priority argument.',
};

const {getType: getStyleType} = createTypeCheckers({
	targetTypeNames: new Set(['CSSStyleDeclaration', 'CSSStyleProperties']),
	allowNullishInMixedUnion: true,
	treatMixedUnionAsNonTarget: true,
	getStaticType: () => nonTarget,
	isNonTargetNode: node => node.type === 'ObjectExpression' || node.type === 'ArrayExpression' || isUndefined(node),
});

const isStyleReceiver = (node, context) => {
	const type = getStyleType(node, context);
	if (type === nonTarget) {
		return false;
	}

	node = unwrapTypeScriptExpression(node);
	return type === target
		|| (node.type === 'Identifier' && node.name === 'style')
		|| isMemberExpression(node, {property: 'style'});
};

const getCssPropertyName = property => {
	if (
		typeof property !== 'string'
		|| property.includes('-')
		|| lexer.getProperty(property.toLowerCase(), false)
	) {
		return;
	}

	let replacement = property === 'cssFloat' ? 'float' : property.replaceAll(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`);
	if (replacement.startsWith('webkit-')) {
		replacement = `-${replacement}`;
	}

	if (
		lexer.getProperty(replacement, false)
		|| (replacement.startsWith('-webkit-') && lexer.getProperty(replacement.slice('-webkit-'.length), false))
	) {
		return replacement;
	}
};

const openingTokens = new Set([tokenTypes.Function, tokenTypes.LeftParenthesis, tokenTypes.LeftSquareBracket, tokenTypes.LeftCurlyBracket]);
const closingTokens = new Set([tokenTypes.RightParenthesis, tokenTypes.RightSquareBracket, tokenTypes.RightCurlyBracket]);

const getImportanceMarkers = value => {
	const markers = [];
	let depth = 0;
	let bangStart;
	let lastTokenEnd;
	let lastCommentEnd = 0;

	tokenize(value, (type, start, end) => {
		if (type === tokenTypes.Comment) {
			lastCommentEnd = end;
			return;
		}

		if (type === tokenTypes.WhiteSpace) {
			return;
		}

		lastTokenEnd = end;
		if (openingTokens.has(type)) {
			depth++;
		} else if (closingTokens.has(type)) {
			depth = Math.max(0, depth - 1);
		} else if (
			depth === 0
			&& bangStart !== undefined
			&& type === tokenTypes.Ident
			&& ident.decode(value.slice(start, end)).toLowerCase() === 'important'
		) {
			markers.push({start: bangStart, end});
		}

		bangStart = depth === 0 && type === tokenTypes.Delim && value.slice(start, end) === '!'
			? start
			: undefined;
	});

	return {markers, lastTokenEnd, lastCommentEnd};
};

const isValidPriority = priority => priority === null || priority === undefined || priority === '' || (typeof priority === 'string' && /^important$/iu.test(priority));
const isPrimitive = value => value === null || !['object', 'function', 'symbol'].includes(typeof value);
const isNonemptyCssomValue = value => isPrimitive(value) && value !== null && value !== '';
const isDirectString = node => getStaticStringValue(unwrapTypeScriptExpression(node)) !== undefined;
const isEditablePriority = node => {
	node = unwrapTypeScriptExpression(node);
	return node.type === 'Literal' || isDirectString(node) || (node.type === 'Identifier' && node.name === 'undefined');
};

const getReplacementSuggestion = (node, replacement) => ({
	messageId: MESSAGE_ID_REPLACE,
	data: {replacement},
	fix: fixer => fixer.replaceText(unwrapTypeScriptExpression(node), escapeString(replacement)),
});

const getValueSuggestion = (callExpression, priorityResult, importance, context) => {
	const [marker] = importance.markers;
	const priority = callExpression.arguments[2];
	if (
		!isDirectString(callExpression.arguments[1])
		|| importance.markers.length !== 1
		|| marker.end !== importance.lastTokenEnd
		|| importance.lastCommentEnd > marker.start
		|| (priority && (!priorityResult || !isValidPriority(priorityResult.value) || !isEditablePriority(priority)))
	) {
		return;
	}

	const value = getStaticStringValue(unwrapTypeScriptExpression(callExpression.arguments[1]));
	const replacement = value.slice(0, marker.start).replace(/[\t\n\f\r ]+$/u, '');
	if (replacement === '') {
		return;
	}

	return {
		messageId: MESSAGE_ID_MOVE_IMPORTANT,
		* fix(fixer) {
			yield fixer.replaceText(unwrapTypeScriptExpression(callExpression.arguments[1]), escapeString(replacement));
			yield priority
				? fixer.replaceText(unwrapTypeScriptExpression(priority), escapeString('important'))
				: appendArgument(fixer, callExpression, escapeString('important'), context);
		},
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', function * (callExpression) {
		if (
			!isMethodCall(callExpression, {method: 'setProperty', minimumArguments: 2})
			|| callExpression.arguments.slice(0, 3).some(argument => argument.type === 'SpreadElement')
			|| !isStyleReceiver(callExpression.callee.object, context)
		) {
			return;
		}

		const [property, value, priority] = callExpression.arguments;
		const propertyResult = getStaticValueForControlFlow(property, context);
		const valueResult = getStaticValueForControlFlow(value, context);
		const priorityResult = priority && getStaticValueForControlFlow(priority, context);
		const replacement = getCssPropertyName(propertyResult?.value);
		if (replacement) {
			yield {
				node: property,
				messageId: MESSAGE_ID_PROPERTY,
				data: {property: propertyResult.value, replacement},
				suggest: isDirectString(property) ? [getReplacementSuggestion(property, replacement)] : [],
			};
		}

		if (typeof valueResult?.value === 'string') {
			const importance = getImportanceMarkers(valueResult.value);
			if (importance.markers.length > 0) {
				const suggestion = getValueSuggestion(callExpression, priorityResult, importance, context);
				yield {
					node: value,
					messageId: MESSAGE_ID_VALUE,
					suggest: suggestion ? [suggestion] : [],
				};
			}
		}

		if (
			!valueResult
			|| !isNonemptyCssomValue(valueResult.value)
			|| !priorityResult
			|| !isPrimitive(priorityResult.value)
			|| isValidPriority(priorityResult.value)
		) {
			return;
		}

		const canSuggestPriority = isDirectString(priority)
			&& /^(?:!\s*)?important$/iu.test(priorityResult.value.trim());
		yield {
			node: priority,
			messageId: MESSAGE_ID_PRIORITY,
			suggest: canSuggestPriority ? [getReplacementSuggestion(priority, 'important')] : [],
		};
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
			description: 'Disallow invalid arguments to `CSSStyleDeclaration#setProperty()`.',
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
