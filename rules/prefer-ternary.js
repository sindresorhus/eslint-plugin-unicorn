'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const schema = [
	{
		oneOf: [
			{
				enum: ['always']
			},
			{
				type: 'object',
				properties: {
					assignment: {
						enum: ['never', 'same', 'any']
					},
					return: {type: 'boolean'},
					call: {type: 'boolean'}
				},
				additionalProperties: false
			}
		]
	}
];

const create = context => {
	function parseOptions(options) {
		let assignmentExpSame = true;
		let assignmentExpAny = false;
		let returnExp = true;
		let callExp = false;

		if (typeof options === 'string') {
			assignmentExpAny = true;
			callExp = true;
		} else if (typeof options === 'object' && options !== null) {
			assignmentExpSame = options.assignment !== 'never';
			assignmentExpAny = options.assignment === 'any';
			returnExp = options.return !== false;
			callExp = options.call === true;
		}

		return {assignmentExpSame,
			assignmentExpAny,
			returnExp,
			callExp
		};
	}

	const options = parseOptions(context.options[0]);

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

	function checkConsequentOrAlternateLength(consequentOrAlternateNode) {
		return consequentOrAlternateNode &&
            consequentOrAlternateNode.body.length === 1;
	}

	function checkConsequentAndAlternateType(node) {
		return node.consequent.body[0].type === node.alternate.body[0].type &&
			(checkConsequentAndAlternateAssignment(node) ||
			checkConsequentAndAlternateReturn(node) ||
				checkConsequentAndAlternateCall(node));
	}

	function checkConsequentAndAlternateAssignment(node) {
		return options.assignmentExpSame &&
			checkConsequentOrAlternateAssignment(node.consequent) &&
			checkConsequentOrAlternateAssignment(node.alternate) &&
			(options.assignmentExpAny ||
				compareConsequentAndAlternateAssignments(node)
			);
	}

	function checkConsequentOrAlternateAssignment(consequentOrAlternateNode) {
		return consequentOrAlternateNode.body[0].type === 'ExpressionStatement' &&
			consequentOrAlternateNode.body[0].expression.type === 'AssignmentExpression';
	}

	function compareConsequentAndAlternateAssignments(node) {
		return node.consequent.body[0].expression.left.name === node.alternate.body[0].expression.left.name;
	}

	function checkConsequentAndAlternateReturn(node) {
		return options.returnExp && node.consequent.body[0].type === 'ReturnStatement';
	}

	function checkConsequentAndAlternateCall(node) {
		return options.callExp &&
				node.consequent.body[0].type === 'ExpressionStatement' &&
				node.consequent.body[0].expression.type === 'CallExpression';
	}

	function fixFunction(node, fixer) {
		let prefix = '';
		const ifCondition = node.test.name;
		let left = '';
		let right = '';
		const sourceCode = context.getSourceCode();
		if (checkConsequentOrAlternateAssignment(node.consequent)) {
			if (compareConsequentAndAlternateAssignments(node)) {
				prefix = sourceCode.getText(node.consequent.body[0].expression.left) + ' = ';
				left = sourceCode.getText(node.consequent.body[0].expression.right);
				right = sourceCode.getText(node.alternate.body[0].expression.right);
			} else {
				left = sourceCode.getText(node.consequent.body[0].expression);
				right = sourceCode.getText(node.alternate.body[0].expression);
			}
		} else if (node.consequent.body[0].type === 'ReturnStatement') {
			prefix = 'return ';
			left = sourceCode.getText(node.consequent.body[0].argument);
			right = sourceCode.getText(node.alternate.body[0].argument);
		} else {
			left = sourceCode.getText(node.consequent.body[0].expression);
			right = sourceCode.getText(node.alternate.body[0].expression);
		}

		const replacement = prefix + ifCondition + ' ? ' + left + ' : ' + right;
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
		schema,
		fixable: 'code'
	}
};
