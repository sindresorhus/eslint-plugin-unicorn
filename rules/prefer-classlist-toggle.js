import {
	isMethodCall,
	isMemberExpression,
	isStringLiteral,
	isCallExpression,
	isExpressionStatement,
} from './ast/index.js';
import {
	replaceMemberExpressionProperty,
	fixSpaceAroundKeyword,
} from './fix/index.js';
import {
	isSameReference,
	isParenthesized,
	getParenthesizedRange,
	getNegatedExpressionText,
	getParenthesizedText,
	getSingleStatement,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-classlist-toggle/error';
const MESSAGE_ID_SUGGESTION = 'prefer-classlist-toggle/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using `Element#classList.toggle()` to toggle class names.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `Element#classList.toggle()`.',
};

const isClassList = node => isMemberExpression(node, {
	property: 'classList',
	computed: false,
});

const getProblem = (valueNode, fix, reportNode) => {
	const problem = {
		node: reportNode ?? valueNode,
		messageId: MESSAGE_ID_ERROR,
	};

	const shouldUseSuggestion = valueNode.type !== 'IfStatement'
		&& !(isExpressionStatement(valueNode) || isExpressionStatement(valueNode.parent));

	if (shouldUseSuggestion) {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix,
			},
		];
	} else {
		problem.fix = fix;
	}

	return problem;
};

const getConditionText = (node, context, isNegative) => {
	if (isNegative) {
		return getNegatedExpressionText(node, context);
	}

	const text = getParenthesizedText(node, context);

	if (
		!isParenthesized(node, context.sourceCode)
		&& node.type === 'SequenceExpression'
	) {
		return `(${text})`;
	}

	return text;
};

const isClassListMethodCall = (node, methods) =>
	isMethodCall(node, {
		methods,
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isClassList(node.callee.object);

const isSameElementAndClassName = (callExpressionA, callExpressionB) =>
	isSameReference(callExpressionA.callee.object, callExpressionB.callee.object)
	&& isSameReference(callExpressionA.arguments[0], callExpressionB.arguments[0]);

const getClassListContainsCall = (conditionNode, isNegative, addOrRemoveCall) => {
	if (!isNegative) {
		if (conditionNode.type === 'UnaryExpression' && conditionNode.operator === '!' && conditionNode.prefix) {
			return getClassListContainsCall(conditionNode.argument, !isNegative, addOrRemoveCall);
		}

		return;
	}

	if (conditionNode.type === 'ChainExpression') {
		conditionNode = conditionNode.expression;
	}

	if (
		isClassListMethodCall(conditionNode, ['contains'])
		&& isSameElementAndClassName(conditionNode, addOrRemoveCall)
	) {
		return conditionNode;
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	/*
	```js
	if (condition) {
		element.classList.add('className');
	} else {
		element.classList.remove('className');
	}
	```

	```js
	condition
		? element.classList.add('className');
		: element.classList.remove('className');
	```
	*/
	context.on(['IfStatement', 'ConditionalExpression'], node => {
		const clauses = [node.consequent, node.alternate]
			.map(node => {
				node = getSingleStatement(node);

				if (node?.type === 'ExpressionStatement') {
					node = node.expression;
				}

				if (node?.type === 'ChainExpression') {
					node = node.expression;
				}

				return node;
			});

		// `element.classList.add('className');`
		// `element.classList.remove('className');`
		if (clauses.some(node => !isClassListMethodCall(node, ['add', 'remove']))) {
			return;
		}

		const [consequent, alternate] = clauses;
		if (
			(consequent.callee.property.name === alternate.callee.property.name)
			|| !isSameElementAndClassName(consequent, alternate)
		) {
			return;
		}

		/**
		@param {import('eslint').Rule.RuleFixer} fixer
		*/
		function * fix(fixer, {abort}) {
			// The whole statement is replaced, a comment inside it would be dropped
			if (sourceCode.getCommentsInside(node).length > 0) {
				abort();
			}

			const elementText = getParenthesizedText(consequent.callee.object.object, context);
			const classNameText = getParenthesizedText(consequent.arguments[0], context);
			const isExpression = node.type === 'ConditionalExpression';
			const isNegative = consequent.callee.property.name === 'remove';
			const conditionNode = node.test;
			const classListContainsCall = getClassListContainsCall(conditionNode, isNegative, consequent);
			const conditionText = classListContainsCall ? '' : getConditionText(conditionNode, context, isNegative);
			const isOptional = consequent.callee.object.optional || alternate.callee.object.optional || classListContainsCall?.callee.object.optional;

			let text = `${elementText}${isOptional ? '?' : ''}.classList.toggle(${classNameText}${conditionText ? `, ${conditionText}` : ''})`;

			if (!isExpression) {
				text += ';';
			}

			if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
				text = `;${text}`;
			}

			yield fixer.replaceText(node, text);

			if (isExpression) {
				yield fixSpaceAroundKeyword(fixer, node, context);
			}
		}

		return getProblem(node, fix);
	});

	// `element.classList[condition ? 'add' : 'remove']('className')`
	context.on('ConditionalExpression', conditionalExpression => {
		const clauses = [conditionalExpression.consequent, conditionalExpression.alternate];

		if (!(
			clauses.every(node => isStringLiteral(node) && (node.value === 'add' || node.value === 'remove'))
			&& clauses[0].value !== clauses[1].value
			&& conditionalExpression.parent.type === 'MemberExpression'
			&& conditionalExpression.parent.computed
			&& !conditionalExpression.parent.optional
			&& conditionalExpression.parent.property === conditionalExpression
			&& isClassList(conditionalExpression.parent.object)
			&& isCallExpression(conditionalExpression.parent.parent, {optional: false, argumentsLength: 1})
			&& conditionalExpression.parent.parent.callee === conditionalExpression.parent
		)) {
			return;
		}

		const classListMethod = conditionalExpression.parent;
		const callExpression = classListMethod.parent;

		/**
		@param {import('eslint').Rule.RuleFixer} fixer
		*/
		function * fix(fixer, {abort}) {
			// The computed member access is rebuilt, a comment in it would be dropped
			if (sourceCode.getCommentsInside(classListMethod).length > 0) {
				abort();
			}

			const isNegative = conditionalExpression.consequent.value === 'remove';
			const conditionNode = conditionalExpression.test;
			const classListContainsCall = getClassListContainsCall(conditionNode, isNegative, callExpression);
			const conditionText = classListContainsCall ? '' : getConditionText(conditionNode, context, isNegative);

			if (conditionText) {
				// A parenthesized argument is only one argument while it keeps its parentheses, so the condition goes after the closing one
				yield fixer.insertTextAfterRange(getParenthesizedRange(callExpression.arguments[0], context), `, ${conditionText}`);
			}

			yield replaceMemberExpressionProperty(fixer, classListMethod, context, '.toggle');
		}

		return getProblem(callExpression, fix, conditionalExpression);
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
			description: 'Prefer using `Element#classList.toggle()` to toggle class names.',
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
