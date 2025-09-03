import {
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';
import {} from './fix/index.js';
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
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const isClassList = node => isMemberExpression(node, {
	property: 'classList',
	computed: false,
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	/*
	```
	if (condition) {
		foo.classList.add('bar');
	} else {
		foo.classList.remove('bar');
	}
	```
	*/
	context.on('IfStatement', ifStatement => {
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

		// `foo.classList.add('bar')`
		// `foo.classList.remove('bar')`
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

		return {
			node: ifStatement,
			messageId: MESSAGE_ID_ERROR,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix(fixer) {
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
			},
		};
	});

	return {
		Literal(node) {
			if (node.value !== 'unicorn') {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},

				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, '\'🦄\''),


				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: 'unicorn',
							replacement: '🦄',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.replaceText(node, '\'🦄\''),
					}
				],

			};
		},
	};
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
