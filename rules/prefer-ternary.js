'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const create = context => {
	function checkIfStatement(node) {
		if (checkConsequentAndAlternateLength(node) &&
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

	function checkConsequentAndAlternateLength(node) {
		return checkConsequentOrAlternateLength(node.consequent) &&
			checkConsequentOrAlternateLength(node.alternate);
	}

	function checkConsequentOrAlternateLength(node) {
		return node && node.body.length === 1;
	}

	function checkConsequentAndAlternateType(node) {
		const consequentType = node.consequent.body[0].type;
		return (consequentType === node.alternate.body[0].type &&
			(consequentType === 'ReturnStatement' ||
				(consequentType === 'ExpressionStatement' && checkConsequentAndAlternateExpressionStatement(node))));
	}

	function checkConsequentAndAlternateExpressionStatement(node) {
		const consequentType = node.consequent.body[0].expression.type;
		return consequentType === node.alternate.body[0].expression.type &&
			(consequentType === 'AssignmentExpression' ? compareConsequentAndAlternateAssignments(node) :
				consequentType === 'YieldExpression');
	}

	function compareConsequentAndAlternateAssignments(node) {
		return node.consequent.body[0].expression.left.name === node.alternate.body[0].expression.left.name;
	}

	function fixFunction(node, fixer) {
		const sourceCode = context.getSourceCode();
		let prefix = '';
		const ifCondition = sourceCode.getText(node.test);
		let left = '';
		let right = '';
		if (node.consequent.body[0].type === 'ExpressionStatement') {
			if (node.consequent.body[0].expression.type === 'AssignmentExpression') {
				prefix = sourceCode.getText(node.consequent.body[0].expression.left) + ' = ';
				left = sourceCode.getText(node.consequent.body[0].expression.right);
				right = sourceCode.getText(node.alternate.body[0].expression.right);
			} else {
				prefix = 'yield ';
				left = sourceCode.getText(node.consequent.body[0].expression.argument);
				right = sourceCode.getText(node.alternate.body[0].expression.argument);
			}
		} else {
			prefix = 'return ';
			left = sourceCode.getText(node.consequent.body[0].argument);
			right = sourceCode.getText(node.alternate.body[0].argument);
		}

		const replacement = prefix + '(' + ifCondition + ' ? ' + left + ' : ' + right + ')';
		return fixer.replaceText(node, replacement);
	}

	return {
		IfStatement: checkIfStatement
	};
};

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
