import {isMethodCall} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isIteratorExpression} from './shared/iterator-helpers.js';
import {
	getParenthesizedRange,
	getParenthesizedText,
	getStaticValueForControlFlow,
	hasUnparenthesizedOptionalChainElement,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-iterator-take-drop';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-take-drop/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` before materializing the iterator instead of slicing the array.',
	[MESSAGE_ID_SUGGESTION]: 'Use `{{replacement}}.toArray()`.',
};

function getIterator(node, context) {
	if (node.type === 'ArrayExpression') {
		const [element] = node.elements;
		if (
			node.elements.length === 1
			&& element?.type === 'SpreadElement'
			&& isIteratorExpression(element.argument, context)
		) {
			return element.argument;
		}

		return;
	}

	if (node.type !== 'CallExpression' || node.typeArguments || node.typeParameters) {
		return;
	}

	if (isMethodCall(node, {
		method: 'toArray',
		argumentsLength: 0,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	}) && !hasUnparenthesizedOptionalChainElement(node, context)) {
		return node.callee.object;
	}

	if (
		isMethodCall(node, {
			object: 'Array',
			method: 'from',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})
		&& isIteratorExpression(node.arguments[0], context)
	) {
		return node.arguments[0];
	}
}

function getHelperCalls(node, context) {
	const bounds = node.arguments.map(argument => getStaticValueForControlFlow(argument, context)?.value);
	if (bounds.some(bound => !(Number.isSafeInteger(bound) && bound >= 0))) {
		return;
	}

	const [start, end] = bounds;
	if (end !== undefined && end <= start) {
		return 'take(0)';
	}

	const calls = [];
	if (start > 0) {
		calls.push(`drop(${start})`);
	}

	if (end !== undefined) {
		calls.push(`take(${end - start})`);
	}

	return calls.join('.');
}

function getSuggestion(node, iterator, replacement, context) {
	const {sourceCode} = context;
	const [iteratorStart, iteratorEnd] = getParenthesizedRange(iterator, context);
	if (sourceCode.getCommentsInside(node).some(comment => {
		const [start, end] = sourceCode.getRange(comment);
		return start < iteratorStart || end > iteratorEnd;
	})) {
		return;
	}

	let iteratorText = getParenthesizedText(iterator, context);
	// Materialization ends optional chains and allows expressions that cannot start a statement.
	if (
		!isParenthesized(iterator, context)
		&& (
			iterator.type === 'ChainExpression'
			|| ['{', '<', 'function', 'class', 'async'].includes(sourceCode.getFirstToken(iterator).value)
			|| shouldAddParenthesesToMemberExpressionObject(iterator, context)
		)
	) {
		iteratorText = `(${iteratorText})`;
	}

	const text = `${iteratorText}.${replacement}.toArray()`;
	const semicolon = needsSemicolon(sourceCode.getTokenBefore(node), context, text) ? ';' : '';

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {replacement},
		* fix(fixer) {
			yield fixer.replaceText(node, semicolon + text);
			yield fixSpaceAroundKeyword(fixer, node, context);
		},
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				method: 'slice',
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			|| node.typeArguments
			|| node.typeParameters
		) {
			return;
		}

		const iterator = getIterator(node.callee.object, context);
		if (!iterator || iterator.type === 'Super') {
			return;
		}

		const replacement = getHelperCalls(node, context);
		if (!replacement) {
			return;
		}

		const suggestion = getSuggestion(node, iterator, replacement, context);
		return {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			data: {replacement},
			...(suggestion && {suggest: [suggestion]}),
		};
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
			description: 'Prefer iterator `take()` and `drop()` over slicing a materialized array.',
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
