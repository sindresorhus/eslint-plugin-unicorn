import {isMethodCall, isNumericLiteral} from './ast/index.js';
import {getParenthesizedText} from './utils/index.js';

const REPLACE_ONE_ELEMENT = 'replace-one-element';
const INSERT_AT_NEGATIVE_ONE = 'insert-at-negative-one';
const SUGGESTION_REPLACE_ONE_ELEMENT = 'suggestion-replace-one-element';
const SUGGESTION_INSERT_AT_NEGATIVE_ONE = 'suggestion-insert-at-negative-one';
const messages = {
	[REPLACE_ONE_ELEMENT]: 'Prefer a direct element replacement instead of `{{method}}()`.',
	[INSERT_AT_NEGATIVE_ONE]: 'Avoid using `{{method}}()` to insert at `-1`.',
	[SUGGESTION_REPLACE_ONE_ELEMENT]: 'Use direct element replacement.',
	[SUGGESTION_INSERT_AT_NEGATIVE_ONE]: 'Resolve the insertion index explicitly.',
};

function getStaticNumberValue(node) {
	if (
		[
			'TSAsExpression',
			'TSTypeAssertion',
			'TSNonNullExpression',
		].includes(node.type)
	) {
		return getStaticNumberValue(node.expression);
	}

	if (isNumericLiteral(node)) {
		return node.value;
	}

	if (
		node.type === 'UnaryExpression'
		&& (node.operator === '+' || node.operator === '-')
		&& isNumericLiteral(node.argument)
	) {
		return node.operator === '-' ? -node.argument.value : node.argument.value;
	}
}

function getMessageId([start, deleteCount]) {
	const deleteCountValue = getStaticNumberValue(deleteCount);

	if (deleteCountValue === 1) {
		return REPLACE_ONE_ELEMENT;
	}

	const startValue = getStaticNumberValue(start);

	if (
		startValue === -1
		&& deleteCountValue === 0
	) {
		return INSERT_AT_NEGATIVE_ONE;
	}
}

function isSimpleReceiver(node) {
	if (node.type === 'Identifier' || node.type === 'ThisExpression') {
		return true;
	}

	return node.type === 'MemberExpression'
		&& !node.computed
		&& !node.optional
		&& isSimpleReceiver(node.object);
}

const hasCommentsInside = (node, sourceCode) => sourceCode.getCommentsInside(node).length > 0;

function getSuggestion(callExpression, messageId, context) {
	const {sourceCode} = context;
	const {object, property} = callExpression.callee;
	const [start, , element] = callExpression.arguments;
	const method = property.name;
	const objectText = getParenthesizedText(object, context);
	const startText = sourceCode.getText(start);
	const elementText = sourceCode.getText(element);

	if (messageId === REPLACE_ONE_ELEMENT) {
		if (hasCommentsInside(callExpression, sourceCode)) {
			return;
		}

		if (method === 'toSpliced') {
			return {
				messageId: SUGGESTION_REPLACE_ONE_ELEMENT,
				fix: fixer => fixer.replaceText(callExpression, `${objectText}.with(${startText}, ${elementText})`),
			};
		}

		if (
			callExpression.parent.type === 'ExpressionStatement'
			&& isSimpleReceiver(object)
			&& (getStaticNumberValue(start) ?? 0) >= 0
		) {
			return {
				messageId: SUGGESTION_REPLACE_ONE_ELEMENT,
				fix: fixer => fixer.replaceText(callExpression, `${objectText}[${startText}] = ${elementText}`),
			};
		}

		return;
	}

	if (
		messageId === INSERT_AT_NEGATIVE_ONE
		&& isSimpleReceiver(object)
		&& !hasCommentsInside(start, sourceCode)
	) {
		return {
			messageId: SUGGESTION_INSERT_AT_NEGATIVE_ONE,
			fix: fixer => fixer.replaceText(start, `Math.max(${objectText}.length - 1, 0)`),
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['splice', 'toSpliced'],
			argumentsLength: 3,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const messageId = getMessageId(callExpression.arguments);
		if (!messageId) {
			return;
		}

		const problem = {
			node: callExpression.callee.property,
			messageId,
			data: {
				method: callExpression.callee.property.name,
			},
		};

		const suggestion = getSuggestion(callExpression, messageId, context);
		if (suggestion) {
			problem.suggest = [suggestion];
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow confusing uses of `Array#{splice,toSpliced}()`.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
	},
};

export default config;
