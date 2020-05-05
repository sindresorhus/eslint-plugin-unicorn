'use strict';
const {isParenthesized} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const selector = [
	'IfStatement',
	'[test.type!="ConditionalExpression"]'
];

const create = context => {
	function checkIfStatement(node) {
		if (isSingleBlockStatement(node) &&
		isSameType(node) &&
			checkConsequentAndAlternateType(node)) {
			context.report({
				node,
				message: 'This `if` statement can be replaced by a ternary operator.',
				fix(fixer) {
					return fixFunction(node, fixer);
				}
			});
		}
	}

	function fixFunction(node, fixer) {
		const sourceCode = context.getSourceCode();
		let prefix = '';
		const ifCondition = sourceCode.getText(node.test);
		let left = '';
		let right = '';
		if (getNodeBody(node.consequent).type === 'ExpressionStatement') {
			const expressionType = getNodeBody(node.consequent).expression.type;
			if (expressionType === 'AssignmentExpression') {
				prefix = sourceCode.getText(getNodeBody(node.consequent).expression.left) + ' = ';
				left = getNodeBody(node.consequent).expression.right;
				right = getNodeBody(node.alternate).expression.right;
			} else {
				if (expressionType === 'AwaitExpression') {
					prefix = 'await ';
				} else {
					prefix = getNodeBody(node.consequent).expression.delegate ? 'yield* ' : 'yield ';
				}

				left = getNodeBody(node.consequent).expression.argument;
				right = getNodeBody(node.alternate).expression.argument;
			}
		} else {
			prefix = 'return ';
			left = getNodeBody(node.consequent).argument;
			right = getNodeBody(node.alternate).argument;
		}

		let leftCode = sourceCode.getText(left);
		if (isParenthesized(left, sourceCode)) {
			leftCode = `(${leftCode})`;
		}

		let rightCode = sourceCode.getText(right);
		if (isParenthesized(right, sourceCode)) {
			rightCode = `(${rightCode})`;
		}

		const replacement = prefix + '(' + ifCondition + ' ? ' + leftCode + ' : ' + rightCode + ')';
		return fixer.replaceText(node, replacement);
	}

	return {
		[selector]: checkIfStatement
	};
};

function isSingleBlockStatement(node) {
	return [node.consequent, node.alternate].every(node => {
		return node && (node.type !== 'BlockStatement' || node.body.length === 1);
	});
}

function getNodeBody(node) {
	// `if (a) b;`
	if (node.type === 'ExpressionStatement') {
		return node.expression;
	}

	if (node.type === 'BlockStatement') {
		const body = node.body.filter(({type}) => type === 'EmptyStatement');
		if (body.length === 1) {
			return getNodeBody(body[0]);
		}
	}

	return node;
}



function isSameType(node) {
	return getNodeBody(node.consequent).type === getNodeBody(node.alternate).type;
}

function checkConsequentAndAlternateType(node) {
	return (
		(getNodeBody(node.consequent).type === 'ReturnStatement' ||
			(getNodeBody(node.consequent).type === 'ExpressionStatement' && checkConsequentAndAlternateExpressionStatement(node))));
}

function checkConsequentAndAlternateExpressionStatement(node) {
	const consequentType = getNodeBody(node.consequent).expression.type;
	return consequentType === getNodeBody(node.alternate).expression.type &&
		(
			consequentType === 'AwaitExpression' ||
			(consequentType === 'YieldExpression' && compareYieldExpressions(node)) ||
			(consequentType === 'AssignmentExpression' && compareConsequentAndAlternateAssignments(node))
		) &&
		checkNotAlreadyTernary(node);
}

function compareYieldExpressions(node) {
	return getNodeBody(node.consequent).expression.delegate === getNodeBody(node.alternate).expression.delegate;
}

function compareConsequentAndAlternateAssignments(node) {
	return getNodeBody(node.consequent).expression.left.name === getNodeBody(node.alternate).expression.left.name;
}

function checkNotAlreadyTernary(node) {
	return getNodeBody(node.consequent).expression.type === 'AssignmentExpression' ?
		getNodeBody(node.consequent).expression.right.type !== 'ConditionalExpression' &&
		getNodeBody(node.alternate).expression.right.type !== 'ConditionalExpression' :
		getNodeBody(node.consequent).expression.argument.type !== 'ConditionalExpression' &&
		getNodeBody(node.alternate).expression.argument.type !== 'ConditionalExpression';
}

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
