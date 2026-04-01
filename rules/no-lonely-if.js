import {isNotSemicolonToken} from '@eslint-community/eslint-utils';
import {isParenthesized, needsSemicolon} from './utils/index.js';

const MESSAGE_ID = 'no-lonely-if';
const messages = {
	[MESSAGE_ID]: 'Unexpected `if` as the only statement in a `if` block without `else`.',
};

const isIfStatementWithoutAlternate = node => node.type === 'IfStatement' && !node.alternate;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#Table
// Lower precedence than `&&`
const needParenthesis = node => (
	(node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '??'))
	|| node.type === 'ConditionalExpression'
	|| node.type === 'AssignmentExpression'
	|| node.type === 'YieldExpression'
	|| node.type === 'SequenceExpression'
);

function getIfStatementTokens(node, sourceCode) {
	const tokens = {
		ifToken: sourceCode.getFirstToken(node),
		openingParenthesisToken: sourceCode.getFirstToken(node, 1),
	};

	const {consequent} = node;
	tokens.closingParenthesisToken = sourceCode.getTokenBefore(consequent);

	if (consequent.type === 'BlockStatement') {
		tokens.openingBraceToken = sourceCode.getFirstToken(consequent);
		tokens.closingBraceToken = sourceCode.getLastToken(consequent);
	}

	return tokens;
}

const getTextBetween = (leftToken, rightToken, sourceCode) =>
	sourceCode.text.slice(sourceCode.getRange(leftToken)[1], sourceCode.getRange(rightToken)[0]);

const preserveGap = text => text.trim() ? text : '';
const joinSourceText = (leftText, rightText) =>
	/\s$/u.test(leftText) && /^\s/u.test(rightText)
		? leftText + rightText.trimStart()
		: leftText + rightText;
const getNodeText = (node, sourceCode) => {
	const [start, end] = sourceCode.getRange(node);
	return sourceCode.text.slice(start, end);
};

const getAsiSuffix = (outerIfStatement, replacementRange, sourceCode) => {
	const [, outerStatementEnd] = sourceCode.getRange(outerIfStatement);

	if (replacementRange[1] === outerStatementEnd) {
		return '';
	}

	const gap = sourceCode.text.slice(outerStatementEnd, replacementRange[1]);
	if (gap.trim() === '') {
		return gap.includes('\n')
			? `;${gap}`
			: ';';
	}

	return `;${gap}`;
};

const getConditionPrefixText = (ifStatement, sourceCode) =>
	getTextBetween(ifStatement.ifToken, ifStatement.openingParenthesisToken, sourceCode);

const getTestText = (ifStatement, context, sourceCode) => {
	const testText = getTextBetween(
		ifStatement.openingParenthesisToken,
		ifStatement.closingParenthesisToken,
		sourceCode,
	);

	if (isParenthesized(ifStatement.test, context)) {
		return testText;
	}

	return needParenthesis(ifStatement.test)
		? `(${testText})`
		: testText;
};

const getConditionText = (ifStatement, context, sourceCode) =>
	joinSourceText(
		preserveGap(getConditionPrefixText(ifStatement, sourceCode)),
		getTestText(ifStatement, context, sourceCode),
	);

function getConsequentTextPieces(outer, inner, sourceCode) {
	const outerConditionGap = outer.openingBraceToken
		? preserveGap(getTextBetween(outer.closingParenthesisToken, outer.openingBraceToken, sourceCode))
		: '';
	const outerLeadingContent = outer.openingBraceToken
		? preserveGap(getTextBetween(outer.openingBraceToken, inner.ifToken, sourceCode))
		: preserveGap(getTextBetween(outer.closingParenthesisToken, inner.ifToken, sourceCode));

	return {
		outerConditionGap,
		outerLeadingContent,
		outerTrailingContent: outer.openingBraceToken
			? preserveGap(getTextBetween(inner, outer.closingBraceToken, sourceCode))
			: '',
	};
}

const shouldKeepCommentAfterCondition = text => text.trimStart().startsWith('//');

function getOuterConditionGapTextPieces(outerConditionGap, outerLeadingContent) {
	// Keep `// ...` after the merged condition so line-scoped directives like
	// `eslint-disable-line` stay attached to the rewritten `if`. Everything else
	// is treated as leading trivia and moved before the merged statement.
	if (shouldKeepCommentAfterCondition(outerConditionGap)) {
		return {
			leadingStatementText: preserveGap(outerLeadingContent).trimStart(),
			conditionSuffixText: outerConditionGap,
		};
	}

	return {
		leadingStatementText: preserveGap(joinSourceText(outerConditionGap, outerLeadingContent)).trimStart(),
		conditionSuffixText: '',
	};
}

function getReplacementRange(outerIfStatement, innerConsequent, context, sourceCode) {
	const replacementRange = [...sourceCode.getRange(outerIfStatement)];

	if (innerConsequent.type === 'BlockStatement') {
		return replacementRange;
	}

	// If the `if` statement has no block, and is not followed by a semicolon,
	// make sure that fixing the issue would not change semantics due to ASI.
	// Similar logic https://github.com/eslint/eslint/blob/2124e1b5dad30a905dc26bde9da472bf622d3f50/lib/rules/no-lonely-if.js#L61-L77
	const lastToken = sourceCode.getLastToken(innerConsequent);
	if (isNotSemicolonToken(lastToken)) {
		const nextToken = sourceCode.getTokenAfter(outerIfStatement);
		if (nextToken && needsSemicolon(lastToken, context, nextToken.value)) {
			replacementRange[1] = sourceCode.getRange(nextToken)[0];
		}
	}

	return replacementRange;
}

function getConsequentText({outerIfStatement, inner, replacementRange, sourceCode, consequentTextPieces, outerConditionGapTextPieces}) {
	const {outerTrailingContent} = consequentTextPieces;
	const {conditionSuffixText} = outerConditionGapTextPieces;

	if (inner.consequent.type === 'BlockStatement') {
		const beforeBlockText = getTextBetween(inner.closingParenthesisToken, inner.openingBraceToken, sourceCode);
		const blockBodyText = getTextBetween(inner.openingBraceToken, inner.closingBraceToken, sourceCode);
		return `${conditionSuffixText}${beforeBlockText}{${blockBodyText}${outerTrailingContent}}`;
	}

	const beforeConsequentText = getTextBetween(inner.closingParenthesisToken, inner.consequent, sourceCode);
	const consequentText = `${conditionSuffixText}${beforeConsequentText}${getNodeText(inner.consequent, sourceCode)}${outerTrailingContent}`;
	return `${consequentText}${getAsiSuffix(outerIfStatement, replacementRange, sourceCode)}`;
}

function fix(innerIfStatement, context) {
	const {sourceCode} = context;

	return fixer => {
		const outerIfStatement = (
			innerIfStatement.parent.type === 'BlockStatement'
				? innerIfStatement.parent
				: innerIfStatement
		).parent;
		const outer = {
			...outerIfStatement,
			...getIfStatementTokens(outerIfStatement, sourceCode),
		};
		const inner = {
			...innerIfStatement,
			...getIfStatementTokens(innerIfStatement, sourceCode),
		};
		const outerConditionPrefixText = getConditionPrefixText(outer, sourceCode);
		const outerTestText = getTestText(outer, context, sourceCode);
		const innerConditionText = getConditionText(inner, context, sourceCode);
		const replacementRange = getReplacementRange(outerIfStatement, inner.consequent, context, sourceCode);
		const consequentTextPieces = getConsequentTextPieces(outer, inner, sourceCode);
		const outerConditionGapTextPieces = getOuterConditionGapTextPieces(
			consequentTextPieces.outerConditionGap,
			consequentTextPieces.outerLeadingContent,
		);
		const {leadingStatementText} = outerConditionGapTextPieces;
		const consequentText = getConsequentText({
			outerIfStatement,
			inner,
			replacementRange,
			sourceCode,
			consequentTextPieces,
			outerConditionGapTextPieces,
		});

		// Keep this as one contiguous replacement. That is the boundary that
		// prevents the overlapping-fixer invalid-code bug from #2915.
		return fixer.replaceTextRange(
			replacementRange,
			`${leadingStatementText}if${outerConditionPrefixText}(${outerTestText} && ${innerConditionText})${consequentText}`,
		);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('IfStatement', ifStatement => {
		if (!(
			isIfStatementWithoutAlternate(ifStatement)
			&& (
				// `if (a) { if (b) {} }`
				(
					ifStatement.parent.type === 'BlockStatement'
					&& ifStatement.parent.body.length === 1
					&& ifStatement.parent.body[0] === ifStatement
					&& isIfStatementWithoutAlternate(ifStatement.parent.parent)
					&& ifStatement.parent.parent.consequent === ifStatement.parent
				)
				// `if (a) if (b) {}`
				|| (
					isIfStatementWithoutAlternate(ifStatement.parent)
					&& ifStatement.parent.consequent === ifStatement
				)
			)
		)) {
			return;
		}

		return {
			node: ifStatement,
			messageId: MESSAGE_ID,
			fix: fix(ifStatement, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `if` statements as the only statement in `if` blocks without `else`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
