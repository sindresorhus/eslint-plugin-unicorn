import {
	isMethodCall,
	isMemberExpression,
	isStringLiteral,
	isCallExpression,
	isExpressionStatement,
} from './ast/index.js';
import {
	replaceMemberExpressionProperty,
} from './fix/index.js';
import {
	isSameReference,
	isParenthesized,
	getParenthesizedText,
	shouldAddParenthesesToUnaryExpressionArgument,
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

	const shouldUseSuggestion = valueNode.type === 'IfStatement'
		? false
		: !(isExpressionStatement(valueNode) || isExpressionStatement(valueNode.parent));

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

/** @param {import('eslint').Rule.RuleContext} context */
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
	context.on(['IfStatement', 'ConditionalExpression'], ifStatement => {
		const clauses = [ifStatement.consequent, ifStatement.alternate]
			.map(node => {
				if (node.type === 'BlockStatement' && node.body.length === 1) {
					node = node.body[0];
				}

				if (node.type === 'ExpressionStatement') {
					node = node.expression;
				}

				if (node.type === 'ChainExpression') {
					node = node.expression;
				}

				return node;
			});

		// `element.classList.add('className');`
		// `element.classList.remove('className');`
		if (!clauses.every(node =>
			isMethodCall(node, {
				methods: ['add', 'remove'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& isClassList(node.callee.object),
		)) {
			return;
		}

		const [consequent, alternate] = clauses;
		if (
			(consequent.callee.property.name === alternate.callee.property.name)
			|| !isSameReference(consequent.callee.object, alternate.callee.object)
			|| !isSameReference(consequent.arguments[0], alternate.arguments[0])
		) {
			return;
		}

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => {
			const isOptional = consequent.callee.object.optional || alternate.callee.object.optional;
			const elementText = getParenthesizedText(consequent.callee.object.object, sourceCode);
			const classNameText = getParenthesizedText(consequent.arguments[0], sourceCode);
			let conditionText = getParenthesizedText(ifStatement.test, sourceCode);

			const isNegative = consequent.callee.property.name === 'remove';
			if (isNegative) {
				if (
					!isParenthesized(ifStatement.test, sourceCode)
					&& shouldAddParenthesesToUnaryExpressionArgument(ifStatement.test, '!')
				) {
					conditionText = `(${conditionText})`;
				}

				conditionText = `!${conditionText}`;
			} else if (
				!isParenthesized(ifStatement.test, sourceCode)
				&& ifStatement.test.type === 'SequenceExpression'
			) {
				conditionText = `(${conditionText})`;
			}

			let text = `${elementText}${isOptional ? '?' : ''}.classList.toggle(${classNameText}, ${conditionText});`;

			if (needsSemicolon(sourceCode.getTokenBefore(ifStatement), sourceCode, text)) {
				text = `;${text}`;
			}

			return fixer.replaceText(ifStatement, text);
		};

		return getProblem(ifStatement, fix);
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

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		function * fix(fixer) {
			let conditionText = getParenthesizedText(conditionalExpression.test, sourceCode);

			const isNegative = conditionalExpression.consequent.value === 'remove';
			if (isNegative) {
				if (
					!isParenthesized(conditionalExpression.test, sourceCode)
					&& shouldAddParenthesesToUnaryExpressionArgument(conditionalExpression.test, '!')
				) {
					conditionText = `(${conditionText})`;
				}

				conditionText = `!${conditionText}`;
			} else if (
				!isParenthesized(conditionalExpression.test, sourceCode)
				&& conditionalExpression.test.type === 'SequenceExpression'
			) {
				conditionText = `(${conditionText})`;
			}

			yield fixer.insertTextAfter(callExpression.arguments[0], `, ${conditionText}`);
			yield replaceMemberExpressionProperty(fixer, classListMethod, sourceCode, '.toggle');
		}

		return getProblem(callExpression, fix, conditionalExpression);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `Element#classList.toggle()` to toggle class names.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
