import {findVariable} from '@eslint-community/eslint-utils';
import {
	getLastTrailingCommentOnSameLine,
	getNextNode,
	getParenthesizedText,
	isGlobalBooleanCall,
	shouldAddParenthesesToUnaryExpressionArgument,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-boolean-return';
const messages = {
	[MESSAGE_ID]: 'Return the boolean expression directly.',
};

const runtimeBooleanBinaryOperators = new Set([
	'==',
	'!=',
	'===',
	'!==',
	'<',
	'<=',
	'>',
	'>=',
	'in',
	'instanceof',
]);

function getNodeBody(node) {
	/* c8 ignore next 3 */
	if (!node) {
		return;
	}

	if (node.type === 'BlockStatement') {
		const body = node.body.filter(({type}) => type !== 'EmptyStatement');
		if (body.length === 1) {
			return getNodeBody(body[0]);
		}
	}

	return node;
}

const getBooleanReturnValue = node => {
	if (
		node?.type === 'ReturnStatement'
		&& node.argument?.type === 'Literal'
		&& typeof node.argument.value === 'boolean'
	) {
		return node.argument.value;
	}
};

function isGlobalArrayIsArrayCall(node, context) {
	return node.type === 'CallExpression'
		&& !node.optional
		&& node.callee.type === 'MemberExpression'
		&& !node.callee.optional
		&& !node.callee.computed
		&& node.callee.object.type === 'Identifier'
		&& node.callee.object.name === 'Array'
		&& context.sourceCode.isGlobalReference(node.callee.object)
		&& node.callee.property.type === 'Identifier'
		&& node.callee.property.name === 'isArray';
}

function isRuntimeBooleanExpression(node, context) {
	switch (node.type) {
		case 'Literal': {
			return typeof node.value === 'boolean';
		}

		case 'UnaryExpression': {
			return ['!', 'delete'].includes(node.operator);
		}

		case 'BinaryExpression': {
			return runtimeBooleanBinaryOperators.has(node.operator);
		}

		case 'LogicalExpression': {
			return isRuntimeBooleanExpression(node.left, context)
				&& isRuntimeBooleanExpression(node.right, context);
		}

		case 'CallExpression': {
			return isGlobalBooleanCall(node, context) || isGlobalArrayIsArrayCall(node, context);
		}

		default: {
			return false;
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	function canUseGlobalBoolean(node) {
		const variable = findVariable(sourceCode.getScope(node), 'Boolean');
		return !variable || variable.defs.length === 0;
	}

	function getBooleanReturnText(node, shouldNegateTest) {
		const text = getParenthesizedText(node, context);

		if (shouldNegateTest) {
			return shouldAddParenthesesToUnaryExpressionArgument(node, '!')
				? `!(${text})`
				: `!${text}`;
		}

		if (isRuntimeBooleanExpression(node, context)) {
			return text;
		}

		const booleanArgumentText = node.type === 'SequenceExpression' ? `(${text})` : text;
		return `Boolean(${booleanArgumentText})`;
	}

	function getProblem(node, consequent, alternate, replacementRange = sourceCode.getRange(node)) {
		if (
			!consequent
			|| !alternate
			|| node.test.type === 'ConditionalExpression'
		) {
			return;
		}

		const consequentValue = getBooleanReturnValue(consequent);
		const alternateValue = getBooleanReturnValue(alternate);
		if (
			consequentValue === undefined
			|| alternateValue === undefined
			|| consequentValue === alternateValue
		) {
			return;
		}

		const problem = {node, messageId: MESSAGE_ID};
		const shouldNegateTest = !consequentValue;
		const hasComments = sourceCode.getCommentsInside(node).length > 0
			|| sourceCode.getCommentsInside(alternate).length > 0
			|| getLastTrailingCommentOnSameLine(context, alternate);
		const needsGlobalBoolean = !shouldNegateTest
			&& !isRuntimeBooleanExpression(node.test, context)
			&& !canUseGlobalBoolean(node);

		if (hasComments || needsGlobalBoolean) {
			return problem;
		}

		return {
			...problem,
			fix: fixer => fixer.replaceTextRange(
				replacementRange,
				`return ${getBooleanReturnText(node.test, shouldNegateTest)};`,
			),
		};
	}

	function getFlatProblem(node) {
		const alternate = getNextNode(node, context);
		if (
			!alternate
			|| alternate.type !== 'ReturnStatement'
		) {
			return;
		}

		const problem = getProblem(
			node,
			getNodeBody(node.consequent),
			alternate,
			[
				sourceCode.getRange(node)[0],
				sourceCode.getRange(alternate)[1],
			],
		);

		if (!problem?.fix) {
			return problem;
		}

		const hasCommentsBetween = sourceCode.getTokensBetween(node, alternate, {includeComments: true})
			.some(token => token.type === 'Block' || token.type === 'Line');
		return hasCommentsBetween
			? {node, messageId: MESSAGE_ID}
			: problem;
	}

	context.on('IfStatement', node => {
		if (!node.alternate) {
			return getFlatProblem(node);
		}

		return getProblem(
			node,
			getNodeBody(node.consequent),
			getNodeBody(node.alternate),
		);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer directly returning boolean expressions over `if` statements.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
