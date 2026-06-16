import {
	isMemberExpression,
	isNullLiteral,
	isUndefined,
} from './ast/index.js';
import {
	isParenthesized,
	getParenthesizedText,
	getMemberAccessOperatorRange,
	hasCommentInRange,
	isSameReference,
	shouldAddParenthesesToLogicalExpressionChild,
	needsSemicolon,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-logical-operator-over-ternary/error';
const MESSAGE_ID_OPTIONAL_CHAIN_ERROR = 'prefer-logical-operator-over-ternary/optional-chain-error';
const MESSAGE_ID_SUGGESTION = 'prefer-logical-operator-over-ternary/suggestion';
const MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION = 'prefer-logical-operator-over-ternary/optional-chain-suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using a logical operator over a ternary.',
	[MESSAGE_ID_OPTIONAL_CHAIN_ERROR]: 'Prefer using optional chaining over a ternary.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}` operator.',
	[MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION]: 'Switch to optional chaining.',
};
const nullishOperators = new Set(['==', '===']);
const nonNullishOperators = new Set(['!=', '!==']);

function isSameNode(left, right, sourceCode) {
	if (isSameReference(left, right)) {
		return true;
	}

	if (left.type !== right.type) {
		return false;
	}

	switch (left.type) {
		case 'AwaitExpression': {
			return isSameNode(left.argument, right.argument, sourceCode);
		}

		case 'LogicalExpression': {
			return (
				left.operator === right.operator
				&& isSameNode(left.left, right.left, sourceCode)
				&& isSameNode(left.right, right.right, sourceCode)
			);
		}

		case 'UnaryExpression': {
			return (
				left.operator === right.operator
				&& left.prefix === right.prefix
				&& isSameNode(left.argument, right.argument, sourceCode)
			);
		}

		case 'UpdateExpression': {
			return false;
		}

		// No default
	}

	return sourceCode.getText(left) === sourceCode.getText(right);
}

function fix({
	fixer,
	context,
	conditionalExpression,
	left,
	right,
	operator,
}) {
	const {sourceCode} = context;
	let text = [left, right].map((node, index) => {
		const isNodeParenthesized = isParenthesized(node, context);
		let text = isNodeParenthesized ? getParenthesizedText(node, context) : sourceCode.getText(node);

		if (
			!isNodeParenthesized
			&& shouldAddParenthesesToLogicalExpressionChild(node, {operator, property: index === 0 ? 'left' : 'right'})
		) {
			text = `(${text})`;
		}

		return text;
	}).join(` ${operator} `);

	// According to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
	// There should be no cases that need to add parentheses when switching ternary to logical expression

	// ASI
	if (needsSemicolon(sourceCode.getTokenBefore(conditionalExpression), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(conditionalExpression, text);
}

function getOptionalChainText(memberExpression, context) {
	const {sourceCode} = context;
	const range = getMemberAccessOperatorRange(memberExpression, context);

	if (hasCommentInRange(context, range)) {
		return;
	}

	const [nodeStart, nodeEnd] = sourceCode.getRange(memberExpression);
	const [operatorStart, operatorEnd] = range;

	return sourceCode.text.slice(nodeStart, operatorStart)
		+ (memberExpression.computed ? '?.[' : '?.')
		+ sourceCode.text.slice(operatorEnd, nodeEnd);
}

function getProblem({
	context,
	conditionalExpression,
	left,
	right,
	operators = ['??', '||'],
}) {
	// The suggestion rebuilds the expression from `left`/`right` only, so it would drop
	// any comment elsewhere in the ternary. Report without a suggestion in that case.
	if (context.sourceCode.getCommentsInside(conditionalExpression).length > 0) {
		return {
			node: conditionalExpression,
			messageId: MESSAGE_ID_ERROR,
		};
	}

	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID_ERROR,
		suggest: operators.map(operator => ({
			messageId: MESSAGE_ID_SUGGESTION,
			data: {operator},
			fix: fixer => fix({
				fixer,
				context,
				conditionalExpression,
				left,
				right,
				operator,
			}),
		})),
	};
}

function getNullishKind(node) {
	if (isNullLiteral(node)) {
		return 'null';
	}

	if (isUndefined(node)) {
		return 'undefined';
	}
}

function getNullishBinaryCheck(node) {
	if (
		node.type !== 'BinaryExpression'
		|| (!nullishOperators.has(node.operator) && !nonNullishOperators.has(node.operator))
	) {
		return;
	}

	const leftKind = getNullishKind(node.left);
	const rightKind = getNullishKind(node.right);

	if (Boolean(leftKind) === Boolean(rightKind)) {
		return;
	}

	const isTrueWhenNullish = nullishOperators.has(node.operator);
	const reference = leftKind ? node.right : node.left;
	const kind = node.operator.length === 2 ? 'nullish' : (leftKind ?? rightKind);

	return {
		reference,
		kind,
		isTrueWhenNullish,
	};
}

const checksNullAndUndefined = (left, right) =>
	(left.kind === 'null' && right.kind === 'undefined')
	|| (left.kind === 'undefined' && right.kind === 'null');

function getNullishTest(node, sourceCode) {
	const binaryCheck = getNullishBinaryCheck(node);

	if (binaryCheck?.kind === 'nullish') {
		return binaryCheck;
	}

	if (node.type !== 'LogicalExpression') {
		return;
	}

	const left = getNullishBinaryCheck(node.left);
	const right = getNullishBinaryCheck(node.right);

	if (
		!left
		|| !right
		|| !isSameNode(left.reference, right.reference, sourceCode)
	) {
		return;
	}

	if (
		node.operator === '||'
		&& left.isTrueWhenNullish
		&& right.isTrueWhenNullish
		&& checksNullAndUndefined(left, right)
	) {
		return {
			reference: left.reference,
			isTrueWhenNullish: true,
		};
	}

	if (
		node.operator === '&&'
		&& !left.isTrueWhenNullish
		&& !right.isTrueWhenNullish
		&& checksNullAndUndefined(left, right)
	) {
		return {
			reference: left.reference,
			isTrueWhenNullish: false,
		};
	}
}

function isUnsafeOptionalChainReplacementContext(conditionalExpression) {
	let node = conditionalExpression;
	let {parent} = node;

	while (
		isTypeScriptExpressionWrapper(parent)
		&& parent.expression === node
	) {
		node = parent;
		parent = node.parent;
	}

	return (
		(
			parent.type === 'UnaryExpression'
			&& parent.operator === 'delete'
			&& parent.argument === node
		)
		|| (
			parent.type === 'CallExpression'
			&& parent.callee === node
		)
		|| (
			parent.type === 'TaggedTemplateExpression'
			&& parent.tag === node
		)
	);
}

function getNullishTernaryProblem(conditionalExpression, context) {
	const {test, consequent, alternate} = conditionalExpression;
	const nullishTest = getNullishTest(test, context.sourceCode);

	if (
		!nullishTest
		|| context.sourceCode.getCommentsInside(conditionalExpression).length > 0
	) {
		return;
	}

	const {reference} = nullishTest;

	if (
		nullishTest.isTrueWhenNullish
		&& isSameNode(reference, alternate, context.sourceCode)
	) {
		return getProblem({
			context,
			conditionalExpression,
			left: alternate,
			right: consequent,
			operators: ['??'],
		});
	}

	if (
		!nullishTest.isTrueWhenNullish
		&& isSameNode(reference, consequent, context.sourceCode)
	) {
		return getProblem({
			context,
			conditionalExpression,
			left: consequent,
			right: alternate,
			operators: ['??'],
		});
	}

	const nullishBranch = nullishTest.isTrueWhenNullish ? consequent : alternate;
	const nonNullishBranch = nullishTest.isTrueWhenNullish ? alternate : consequent;

	if (
		!isUndefined(nullishBranch)
		|| !isMemberExpression(nonNullishBranch)
		|| nonNullishBranch.optional
		|| !isSameReference(unwrapTypeScriptExpression(reference), unwrapTypeScriptExpression(nonNullishBranch.object))
		|| isUnsafeOptionalChainReplacementContext(conditionalExpression)
	) {
		return;
	}

	const optionalChainText = getOptionalChainText(nonNullishBranch, context);

	if (!optionalChainText) {
		return;
	}

	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID_OPTIONAL_CHAIN_ERROR,
		suggest: [
			{
				messageId: MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION,
				fix(fixer) {
					let text = optionalChainText;

					if (needsSemicolon(context.sourceCode.getTokenBefore(conditionalExpression), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(conditionalExpression, text);
				},
			},
		],
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ConditionalExpression', conditionalExpression => {
		const {test, consequent, alternate} = conditionalExpression;
		const nullishTernaryProblem = getNullishTernaryProblem(conditionalExpression, context);

		if (nullishTernaryProblem) {
			return nullishTernaryProblem;
		}

		// `foo ? foo : bar`
		if (isSameNode(test, consequent, sourceCode)) {
			return getProblem({
				context,
				conditionalExpression,
				left: test,
				right: alternate,
			});
		}

		// `!bar ? foo : bar`
		if (
			test.type === 'UnaryExpression'
			&& test.operator === '!'
			&& test.prefix
			&& isSameNode(test.argument, alternate, sourceCode)
		) {
			return getProblem({
				context,
				conditionalExpression,
				left: test.argument,
				right: consequent,
			});
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using a logical operator over a ternary.',
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
