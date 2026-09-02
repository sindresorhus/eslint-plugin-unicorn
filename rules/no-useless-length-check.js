import {isMethodCall, isMemberExpression} from './ast/index.js';
import {
	getParenthesizedRange,
	getIndentString,
	hasMultilineToken,
	isSameReference,
	isLogicalExpression,
	isKnownNonIndexedCollection,
	wouldRemoveComments,
} from './utils/index.js';

const messages = {
	'for-of': 'The non-empty check is useless as `for…of` does not iterate over an empty array.',
	'non-zero': 'The non-empty check is useless as `Array#some()` returns `false` for an empty array.',
	zero: 'The empty check is useless as `Array#every()` returns `true` for an empty array.',
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

	let {consequent} = node;
	if (consequent.type === 'BlockStatement') {
		if (consequent.body.length !== 1) {
			return;
		}

		[consequent] = consequent.body;
	}

	if (consequent.type === 'ForOfStatement' && !consequent.await) {
		return consequent;
	}
};

const getUnindentedText = (node, parent, context) => {
	const {sourceCode} = context;
	const sourceIndent = getIndentString(node, context);
	const targetIndent = getIndentString(parent, context);
	const [firstLine, ...remainingLines] = sourceCode.getText(node).split('\n');
	if (remainingLines.some(line => line.trim() !== '' && !line.startsWith(sourceIndent))) {
		return;
	}

	return [
		firstLine,
		...remainingLines.map(line => line.trim() === '' ? line : `${targetIndent}${line.slice(sourceIndent.length)}`),
	].join('\n');
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

	function isUselessLengthCheckNode({node, operator, siblings}) {
		return (
			(
				operator === '||'
				&& zeroLengthChecks.has(node)
				&& siblings.some(condition => isMatchingCall(condition, 'every', node))
			)
			|| (
				operator === '&&'
				&& nonZeroLengthChecks.has(node)
				&& siblings.some(condition => isMatchingCall(condition, 'some', node))
			)
		);
	}

	function getUselessLengthCheckNode(logicalExpression) {
		const {operator} = logicalExpression;
		return flatLogicalExpression(logicalExpression)
			.filter((node, index, conditions) => isUselessLengthCheckNode({
				node,
				operator,
				siblings: [
					conditions[index - 1],
					conditions[index + 1],
				].filter(Boolean),
			}));
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
			const unindentedText = getUnindentedText(loop, node, context);
			if (unindentedText !== undefined) {
				problem.fix = fixer => fixer.replaceText(node, unindentedText);
			}
		}

		return problem;
	});

	context.on('LogicalExpression', node => {
		if (isLogicalExpression(node)) {
			logicalExpressions.push(node);
		}
	});

	context.on('Program:exit', function * () {
		const nodes = new Set(logicalExpressions.flatMap(logicalExpression =>
			getUselessLengthCheckNode(logicalExpression)));

		for (const node of nodes) {
			yield {
				loc: {
					start: sourceCode.getLoc(node.left.property).start,
					end: sourceCode.getLoc(node).end,
				},
				messageId: zeroLengthChecks.has(node) ? 'zero' : 'non-zero',
				/**
				@param {import('eslint').Rule.RuleFixer} fixer
				*/
				fix(fixer) {
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

					return fixer.removeRange(range);
				},
			};
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
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
