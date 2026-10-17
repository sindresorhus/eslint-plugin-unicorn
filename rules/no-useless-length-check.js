import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall, isMemberExpression} from './ast/index.js';
import {
	getParenthesizedRange,
	getIndentString,
	getSingleStatement,
	hasCommentInRange,
	hasMultilineToken,
	isSameReference,
	isLogicalExpression,
	isOutermostLogicalExpression,
	isKnownNonIndexedCollection,
	isSideEffectFreeFunction,
	needsSemicolon,
	reindentText,
	wouldRemoveComments,
} from './utils/index.js';

const messages = {
	'for-of': 'The non-empty check is useless as `for…of` does not iterate over an empty array.',
	'non-zero': 'The non-empty check is useless as `Array#some()` returns `false` for an empty array.',
	zero: 'The empty check is useless as `Array#every()` returns `true` for an empty array.',
	'remove-length-check': 'Remove the length check.',
};

// We assume the user already follows `unicorn/explicit-length-check`. These are allowed in that rule.
const isLengthCompareZero = node =>
	node.type === 'BinaryExpression'
	&& node.right.type === 'Literal'
	&& node.right.raw === '0'
	&& isMemberExpression(node.left, {property: 'length', optional: false});

const getGuardedForOfStatement = node => {
	if (node.alternate) {
		return;
	}

	const statement = getSingleStatement(node.consequent);
	if (statement?.type === 'ForOfStatement' && !statement.await) {
		return statement;
	}
};

const hasLoopBindingReferenceInRight = (loop, sourceCode) => {
	const loopScope = sourceCode.scopeManager.acquire(loop);
	if (!loopScope) {
		return false;
	}

	const [rightStart, rightEnd] = sourceCode.getRange(loop.right);
	return loopScope.variables.some(variable => variable.references.some(reference => {
		const [referenceStart, referenceEnd] = sourceCode.getRange(reference.identifier);
		return referenceStart >= rightStart && referenceEnd <= rightEnd;
	}));
};

function flatLogicalExpression(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === node.operator
			? flatLogicalExpression(child)
			: [child]);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const logicalExpressions = [];
	const zeroLengthChecks = new Set();
	const nonZeroLengthChecks = new Set();
	const {sourceCode} = context;
	const startsAtLineIndent = node => getIndentString(node, context).length === sourceCode.getLoc(node).start.column;

	// Resolving the receiver type is expensive, so it runs last, after the cheap shape and reference checks
	const isMatchingCall = (condition, method, lengthCheck) =>
		isMethodCall(condition, {
			method,
			optionalCall: false,
			optionalMember: false,
		})
		&& isSameReference(lengthCheck.left.object, condition.callee.object)
		// Ignore receivers known to be neither an array nor a typed array
		&& !isKnownNonIndexedCollection(condition.callee.object, context);

	function getMatchingMethod(node, operator) {
		if (operator === '||' && zeroLengthChecks.has(node)) {
			return 'every';
		}

		if (operator === '&&' && nonZeroLengthChecks.has(node)) {
			return 'some';
		}
	}

	/**
	@param {import('eslint').Rule.RuleFixer} fixer
	*/
	function removeLengthCheck(fixer, node) {
		const {left, right} = node.parent;
		const leftRange = getParenthesizedRange(left, context);
		const rightRange = getParenthesizedRange(right, context);
		const range = [];
		if (left === node) {
			range[0] = leftRange[0];
			range[1] = rightRange[0];
		} else {
			range[0] = leftRange[1];
			range[1] = rightRange[1];
		}

		// The removed range holds the length check and the operator, so a comment there would be lost
		if (hasCommentInRange(context, range)) {
			return;
		}

		const replacement = left === node && needsSemicolon(sourceCode.getTokenBefore({range}), context, sourceCode.text[range[1]]) ? ';' : '';
		return fixer.replaceTextRange(range, replacement);
	}

	function * getUselessLengthCheckProblems(logicalExpression) {
		const {operator} = logicalExpression;
		const conditions = flatLogicalExpression(logicalExpression);

		for (const [index, node] of conditions.entries()) {
			const method = getMatchingMethod(node, operator);
			if (!method) {
				continue;
			}

			const previous = conditions[index - 1];
			const next = conditions[index + 1];
			const isLeadingCheck = Boolean(next) && isMatchingCall(next, method, node);
			if (!isLeadingCheck && !(previous && isMatchingCall(previous, method, node))) {
				continue;
			}

			const fix = fixer => removeLengthCheck(fixer, node);
			// Removing a leading check evaluates the call arguments for an empty array, and removing a trailing check ignores callbacks that change the array's length
			const isSafeToFix = isLeadingCheck
				? next.arguments.every(argument => !hasSideEffect(argument, sourceCode))
				// An inline callback without side effects cannot change the array's length
				: isSideEffectFreeFunction(previous.arguments[0], context);

			yield {
				loc: {
					start: sourceCode.getLoc(node.left.property).start,
					end: sourceCode.getLoc(node).end,
				},
				messageId: zeroLengthChecks.has(node) ? 'zero' : 'non-zero',
				...(isSafeToFix ? {fix} : {suggest: [{messageId: 'remove-length-check', fix}]}),
			};
		}
	}

	context.on('BinaryExpression', node => {
		if (!isLengthCompareZero(node) || !isLogicalExpression(node.parent)) {
			return;
		}

		const {operator} = node;
		if (operator === '===') {
			zeroLengthChecks.add(node);
		} else if (operator === '>' || operator === '!==') {
			nonZeroLengthChecks.add(node);
		}
	});

	context.on('IfStatement', node => {
		const lengthCheck = node.test;
		const loop = getGuardedForOfStatement(node);
		if (
			!loop
			|| !isLengthCompareZero(lengthCheck)
			|| !['>', '!=='].includes(lengthCheck.operator)
			|| !isSameReference(lengthCheck.left.object, loop.right)
			|| hasLoopBindingReferenceInRight(loop, sourceCode)
			|| isKnownNonIndexedCollection(loop.right, context)
		) {
			return;
		}

		const problem = {
			loc: {
				start: sourceCode.getLoc(lengthCheck.left.property).start,
				end: sourceCode.getLoc(lengthCheck).end,
			},
			messageId: 'for-of',
		};
		const {start, end} = sourceCode.getLoc(loop);
		const canUnindent = start.line === end.line || (startsAtLineIndent(node) && startsAtLineIndent(loop));

		if (
			canUnindent
			&& !hasMultilineToken(loop, context)
			&& !wouldRemoveComments(context, node, [loop])
		) {
			problem.fix = fixer => fixer.replaceText(node, reindentText(sourceCode.getText(loop), getIndentString(loop, context), getIndentString(node, context)));
		}

		return problem;
	});

	context.on('LogicalExpression', node => {
		if (isLogicalExpression(node) && isOutermostLogicalExpression(node)) {
			logicalExpressions.push(node);
		}
	});

	context.on('Program:exit', function * () {
		for (const logicalExpression of logicalExpressions) {
			yield getUselessLengthCheckProblems(logicalExpression);
		}
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
			description: 'Disallow useless array length check.',
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
