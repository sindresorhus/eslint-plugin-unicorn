'use strict';
const eslintTemplateVisitor = require('eslint-template-visitor');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID_FINDINDEX = 'findIndex';
const messages = {
	[MESSAGE_ID_FINDINDEX]: 'Use `.indexOf()`, rather than `.findIndex()`, when searching the index of an item.'
};

const templates = eslintTemplateVisitor();

const objectVariable = templates.variable();
const argumentsVariable = templates.spreadVariable();

const findIndexCallTemplate = templates.template`${objectVariable}.findIndex(${argumentsVariable})`;

const getSearchedConstant = node => {
	if (
		!node ||
		(node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression')
	) {
		return;
	}

	const {params, body} = node;
	let statement = body;

	if (
		body.type === 'BlockStatement'
	) {
		const statements = body.body;

		if (
			statements.length !== 1 ||
			statements[0].type !== 'ReturnStatement' ||
			!statements[0].argument
		) {
			return;
		}

		statement = statements[0].argument;
	}

	if (
		params.length !== 1 ||
		!statement ||
		statement.type !== 'BinaryExpression' ||
		statement.operator !== '==='
	) {
		return;
	}

	const parameter = params[0];
	let item;
	let constant;

	if (statement.right.type === 'Literal') {
		item = statement.left;
		constant = statement.right;
	} else if (statement.left.type === 'Literal') {
		item = statement.right;
		constant = statement.left;
	} else {
		return;
	}

	if (
		!constant ||
		Boolean(item.callee) ||
		parameter.type !== 'Identifier' ||
		item.type !== 'Identifier' ||
		parameter.name !== item.name
	) {
		return;
	}

	return constant;
};

const create = context => {
	const sourceCode = context.getSourceCode();

	const getNodeText = node => {
		const text = sourceCode.getText(node);
		const before = sourceCode.getTokenBefore(node);
		const after = sourceCode.getTokenAfter(node);
		if (
			(before && before.type === 'Punctuator' && before.value === '(') &&
			(after && after.type === 'Punctuator' && after.value === ')')
		) {
			return `(${text})`;
		}

		return text;
	};

	return templates.visitor({
		[findIndexCallTemplate](node) {
			const objectNode = findIndexCallTemplate.context.getMatch(objectVariable);
			const argumentNodes = findIndexCallTemplate.context.getMatch(argumentsVariable);

			if (
				argumentNodes.length !== 1
			) {
				return;
			}

			const searchedConstant = getSearchedConstant(argumentNodes[0]);

			if (
				searchedConstant === null ||
				searchedConstant === undefined
			) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID_FINDINDEX
			};

			const searchedConstantText = sourceCode.getText(searchedConstant);
			const objectText = getNodeText(objectNode);
			problem.fix = fixer => fixer.replaceText(node, `${objectText}.indexOf(${searchedConstantText})`);

			context.report(problem);
		}
	});
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
