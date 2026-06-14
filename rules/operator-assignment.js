import {getBuiltinRule} from './utils/index.js';

const baseRule = getBuiltinRule('operator-assignment');

const MESSAGE_ID_SUGGESTION = 'operator-assignment/suggestion';

const messages = {
	...baseRule.meta.messages,
	[MESSAGE_ID_SUGGESTION]: 'Use `+=` assignment.',
};

function getTemplateLiteralTailRange(templateLiteral, sourceCode) {
	const [nextQuasiStart] = sourceCode.getRange(templateLiteral.quasis[1]);
	const [, templateEnd] = sourceCode.getRange(templateLiteral);
	return [nextQuasiStart + 1, templateEnd];
}

function getTemplateLiteralTailText(sourceCode, [start, end]) {
	return `\`${sourceCode.text.slice(start, end)}`;
}

function hasCommentsOutsideRange(node, sourceCode, [rangeStart, rangeEnd]) {
	return sourceCode.getCommentsInside(node).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart < rangeStart || commentEnd > rangeEnd;
	});
}

function getTemplateLiteralProblem(node, sourceCode) {
	if (
		node.operator !== '='
		|| node.left.type !== 'Identifier'
		|| node.right.type !== 'TemplateLiteral'
	) {
		return;
	}

	const {left, right} = node;
	const [firstExpression] = right.expressions;

	if (
		right.quasis[0].value.raw !== ''
		|| firstExpression?.type !== 'Identifier'
		|| firstExpression.name !== left.name
	) {
		return;
	}

	const templateLiteralTailRange = getTemplateLiteralTailRange(right, sourceCode);
	if (hasCommentsOutsideRange(node, sourceCode, templateLiteralTailRange)) {
		return;
	}

	const templateLiteralTailText = getTemplateLiteralTailText(sourceCode, templateLiteralTailRange);
	if (templateLiteralTailText === '``') {
		return;
	}

	return {
		node,
		messageId: 'replaced',
		data: {
			operator: '+=',
		},
		suggest: [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix: fixer => fixer.replaceText(node, `${sourceCode.getText(left)} += ${templateLiteralTailText}`),
			},
		],
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {AssignmentExpression: onAssignmentExpression} = baseRule.create(context);
	const shouldCheckTemplateLiterals = context.options[0] !== 'never';

	context.on('AssignmentExpression', node => {
		onAssignmentExpression(node);

		if (!shouldCheckTemplateLiterals) {
			return;
		}

		return getTemplateLiteralProblem(node, sourceCode);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: baseRule.meta.type,
		docs: {
			description: 'Require assignment operator shorthand where possible.',
			recommended: true,
		},
		fixable: baseRule.meta.fixable,
		hasSuggestions: true,
		schema: baseRule.meta.schema,
		defaultOptions: ['always'],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
