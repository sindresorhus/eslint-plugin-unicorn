'use strict';
const {flatten} = require('lodash');
const pluralize = require('pluralize');
const avoidCapture = require('./utils/avoid-capture');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getParentheses = require('./utils/get-parentheses');

const MESSAGE_ID = 'no-complex-iteratee-expression';
const messages = {
	[MESSAGE_ID]: 'Move the complex iteratee expression out of the "for-of" header.'
};

const complexForSelector = [
	'ForOfStatement',
	`:not(${
		[
			'[right.type="Identifier"]',
			'[right.type="ArrayExpression"]',
			'[right.type="MemberExpression"]',
			'[right.type="CallExpression"][right.arguments.length=0]',
			[
				'[right.type="CallExpression"]',
				'[right.callee.type="MemberExpression"]',
				'[right.callee.object.type="Identifier"]',
				'[right.callee.object.name="Object"]',
				'[right.callee.property.type="Identifier"]',
				'[right.callee.property.name=/^(?:keys|values|entries)$/]'
			].join('')
		].join(', ')
	})`
].join('');

const getScopes = scope => [
	scope,
	...flatten(scope.childScopes.map(scope => getScopes(scope)))
];

const getIndentString = (node, sourceCode) => {
	const {line, column} = sourceCode.getLocFromIndex(node.range[0]);
	const lines = sourceCode.getLines();
	const before = lines[line - 1].slice(0, column);

	return before.match(/\s*$/)[0];
};

const getParenthesizedRange = (node, sourceCode) => {
	const [firstToken = node, lastToken = node] = getParentheses(node, sourceCode);

	const [start] = firstToken.range;
	const [, end] = lastToken.range;
	return [start, end];
};

const scopeStatements = new Set(['DoWhileStatement', 'ForInStatement', 'ForOfStatement', 'ForStatement', 'WhileStatement', 'WithStatement']);
const shouldAddBraces = node => {
	if (node.parent.type === 'IfStatement') {
		return node.parent.consequent === node || node.parent.alternate === node;
	}

	if (node.parent.type === 'SwitchCase') {
		return node.parent.consequent.includes(node);
	}

	if (scopeStatements.has(node.parent.type)) {
		return node.parent.body === node;
	}

	return false;
};

const create = context => {
	const sourceCode = context.getSourceCode();
	return {
		[complexForSelector](node) {
			// Checks if we can deduce a name for the iteratee from the iterated value
			if (node.left.type === 'VariableDeclaration' &&
				node.left.declarations.length === 1 &&
				node.left.declarations[0].id.type === 'Identifier') {
				const scopes = getScopes(context.getScope());

				const iterateeNameCandidate = pluralize(node.left.declarations[0].id.name);
				const iterateeName = avoidCapture(iterateeNameCandidate, scopes, context.parserOptions.ecmaVersion);

				const iteratee = sourceCode.getText(node.right);

				context.report({
					node: node.right,
					messageId: MESSAGE_ID,
					* fix(fixer) {
						const indents = getIndentString(node, sourceCode);
						if (shouldAddBraces(node)) {
							yield fixer.insertTextBefore(node, '{');
							yield fixer.insertTextAfter(node, '}');
						}

						if (node.right.type === 'SequenceExpression') {
							const range = getParenthesizedRange(node.right, sourceCode);
							yield fixer.replaceTextRange(range, iterateeName);
							yield fixer.insertTextBefore(node, `const ${iterateeName} = (${iteratee});\n${indents}`);
						} else {
							yield fixer.replaceText(node.right, iterateeName);
							yield fixer.insertTextBefore(node, `const ${iterateeName} = ${iteratee};\n${indents}`);
						}
					}
				});
				return;
			}

			context.report({
				node: node.right,
				messageId: MESSAGE_ID
			});
		}
	};
};

const schema = [];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages
	}
};
