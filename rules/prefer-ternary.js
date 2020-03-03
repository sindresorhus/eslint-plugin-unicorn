'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
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
				left = sourceCode.getText(getNodeBody(node.consequent).expression.right);
				right = sourceCode.getText(getNodeBody(node.alternate).expression.right);
			} else {
				prefix = expressionType === 'AwaitExpression' ? 'await ' : 'yield ';
				left = sourceCode.getText(getNodeBody(node.consequent).expression.argument);
				right = sourceCode.getText(getNodeBody(node.alternate).expression.argument);
			}
		} else {
			prefix = 'return ';
			left = sourceCode.getText(getNodeBody(node.consequent).argument);
			right = sourceCode.getText(getNodeBody(node.alternate).argument);
		}

		const replacement = prefix + '(' + ifCondition + ' ? ' + left + ' : ' + right + ')';
		return fixer.replaceText(node, replacement);
	}

	return {
		IfStatement: checkIfStatement
	};
};

function isSingleBlockStatement(node) {
	return [node.consequent, node.alternate].every(node => {
		return node && (node.type !== 'BlockStatement' || node.body.length === 1);
	});
}

function getNodeBody(node) {
	return node.type === 'BlockStatement' ? node.body[0] : node;
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
		(consequentType === 'YieldExpression' ||
			consequentType === 'AwaitExpression' ||
			(consequentType === 'AssignmentExpression' && compareConsequentAndAlternateAssignments(node))
		) &&
		checkNotAlreadyTernary(node);
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
