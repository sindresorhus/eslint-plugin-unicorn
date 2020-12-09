'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_FINDINDEX = 'findIndex';
const messages = {
	[MESSAGE_ID_FINDINDEX]: 'Use `.indexOf()`, rather than `.findIndex()`, when searching the index of an item.'
};

const selector = [
	methodSelector({
		name: 'findIndex',
		length: 1
	}),
	`:matches(${
		[
			// Matches `foo.findIndex(bar => bar === baz)`
			[
				'[arguments.0.type="ArrowFunctionExpression"]',
				'[arguments.0.params.length=1]',
				'[arguments.0.params.0.type="Identifier"]',
				'[arguments.0.body.type="BinaryExpression"]',
				'[arguments.0.body.operator="==="]'
			].join(''),
			// Matches `foo.findIndex(bar => {return bar === baz})`
			// Matches `foo.findIndex(function (bar) {return bar === baz})`
			[
				':matches([arguments.0.type="ArrowFunctionExpression"], [arguments.0.type="FunctionExpression"])',
				'[arguments.0.params.length=1]',
				'[arguments.0.params.0.type="Identifier"]',
				'[arguments.0.body.type="BlockStatement"]',
				'[arguments.0.body.body.length=1]',
				'[arguments.0.body.body.0.type="ReturnStatement"]',
				'[arguments.0.body.body.0.argument.type="BinaryExpression"]',
				'[arguments.0.body.body.0.argument.operator="==="]'
			].join('')
		].join(', ')
	})`
].join('');

const create = context => {
	const sourceCode = context.getSourceCode();

	const getNodeText = node => {
		const text = sourceCode.getText(node);
		const before = sourceCode.getTokenBefore(node);
		const after = sourceCode.getTokenAfter(node);
		if (
			before &&
			before.type === 'Punctuator' &&
			before.value === '(' &&
			after &&
			after.type === 'Punctuator' &&
			after.value === ')'
		) {
			return `(${text})`;
		}

		return text;
	};

	return {
		[selector](node) {
			const [callback] = node.arguments;
			const binaryExpression = callback.body.type === 'BinaryExpression' ?
				callback.body :
				callback.body.body[0].argument;
			const [parameter] = callback.params;
			const {left, right} = binaryExpression;

			let item;
			let constant;

			if (right.type === 'Literal') {
				item = left;
				constant = right;
			} else if (left.type === 'Literal') {
				item = right;
				constant = left;
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

			const problem = {
				node,
				messageId: MESSAGE_ID_FINDINDEX
			};

			const searchedConstantText = sourceCode.getText(constant);
			const objectText = getNodeText(node.callee);
			problem.fix = fixer => fixer.replaceText(node, `${objectText}.indexOf(${searchedConstantText})`);

			context.report(problem);
		}
	};
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
