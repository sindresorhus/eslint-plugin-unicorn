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
					call: {type: 'boolean'},
					new: {type: 'boolean'},
					throw: {type: 'boolean'},
					yield: {type: 'boolean'},
					await: {type: 'boolean'}
				},
				additionalProperties: false
			}
		]
	}
];

const create = context => {
	function parseOptions(options) {
		const optionsDefined = options ? options : {};
		const optionsObject =
		{
			AssignmentExpression: optionsDefined.assignment ? optionsDefined.assignment : 'same',
			ReturnStatement: optionsDefined.return !== false,
			CallExpression: optionsDefined.call === true,
			NewExpression: optionsDefined.new === true,
			ThrowStatement: optionsDefined.throw !== false,
			YieldExpression: optionsDefined.yield !== false,
			AwaitExpression: optionsDefined.await === true
		};

		if (typeof options === 'string') {
			optionsObject.AssignmentExpression = 'any';
			optionsObject.CallExpression = true;
			optionsObject.NewExpression = true;
			optionsObject.AwaitExpression = true;
		}

		return optionsObject;
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
		const consequentType = node.consequent.body[0].type;
		return (consequentType === node.alternate.body[0].type &&
		((Object.keys(options).includes(consequentType) && options[consequentType]) ||
		(consequentType === 'ExpressionStatement' && checkConsequentAndAlternateExpressionStatement(node))));
	}

	function checkConsequentAndAlternateExpressionStatement(node) {
		const consequentType = node.consequent.body[0].expression.type;
		return consequentType === node.alternate.body[0].expression.type &&
		(consequentType === 'AssignmentExpression' ? checkConsequentAndAlternateAssignment(node) :
			(Object.keys(options).includes(consequentType) && options[consequentType]));
	}

	function checkConsequentAndAlternateAssignment(node) {
		return options.AssignmentExpression === 'any' ||
		(options.AssignmentExpression === 'same' && compareConsequentAndAlternateAssignments(node));
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
		if (node.consequent.body[0].type === 'ExpressionStatement' &&
			node.consequent.body[0].expression.type === 'AssignmentExpression' &&
			compareConsequentAndAlternateAssignments(node)) {
			prefix = sourceCode.getText(node.consequent.body[0].expression.left) + ' = ';
			left = sourceCode.getText(node.consequent.body[0].expression.right);
			right = sourceCode.getText(node.alternate.body[0].expression.right);
		} else if (node.consequent.body[0].type === 'ReturnStatement') {
			prefix = 'return ';
			left = sourceCode.getText(node.consequent.body[0].argument);
			right = sourceCode.getText(node.alternate.body[0].argument);
		} else if (node.consequent.body[0].type === 'ThrowStatement') {
			prefix = 'throw ';
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
