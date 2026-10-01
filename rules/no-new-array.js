import {
	isParenthesized,
	needsSemicolon,
	getStaticValueForControlFlow,
} from './utils/index.js';
import {isNewExpression} from './ast/index.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SPREAD = 'spread';
const messages = {
	[MESSAGE_ID_ERROR]: '`new Array()` is unclear in intent; use an array literal or `Array.from()`.',
	[MESSAGE_ID_SPREAD]: 'Spread the argument.',
};

function getProblem(context, node) {
	if (
		!isNewExpression(node, {
			name: 'Array',
			argumentsLength: 1,
			allowSpreadElement: true,
		})
	) {
		return;
	}

	const problem = {
		node,
		messageId: MESSAGE_ID_ERROR,
	};

	const {sourceCode} = context;
	// Every replacement is built from the argument alone, so a comment inside the call would be lost
	if (sourceCode.getCommentsInside(node).length > 0) {
		return problem;
	}

	const [argumentNode] = node.arguments;
	let text = sourceCode.getText(argumentNode);
	if (isParenthesized(argumentNode, context)) {
		text = `(${text})`;
	}

	const maybeSemiColon = needsSemicolon(sourceCode.getTokenBefore(node), context, '[')
		? ';'
		: '';
	const arrayLiteralText = `${maybeSemiColon}[${text}]`;

	// We are not sure how many `arguments` passed
	if (argumentNode.type === 'SpreadElement') {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SPREAD,
				fix: fixer => fixer.replaceText(node, arrayLiteralText),
			},
		];
		return problem;
	}

	/*
	`new Array(length)` creates `length` holes and `Array.from({length})` creates `length` `undefined` values. There is no dense spelling of a holey array, so a length, or a value that may be one, is only reported.
	*/
	const result = getStaticValueForControlFlow(argumentNode, context);
	if (result === undefined || typeof result.value === 'number') {
		return problem;
	}

	problem.fix = fixer => fixer.replaceText(node, arrayLiteralText);
	return problem;
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('NewExpression', node => getProblem(context, node));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `new Array()`.',
			recommended: 'unopinionated',
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
