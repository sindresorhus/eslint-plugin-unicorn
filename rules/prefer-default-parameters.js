'use strict';
const {findVariable} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'preferDefaultParameters';
const MESSAGE_ID_SUGGEST = 'preferDefaultParametersSuggest';

const assignmentSelector = [
	'ExpressionStatement',
	'[expression.type="AssignmentExpression"]'
].join('');

const declarationSelector = [
	'VariableDeclaration',
	'[declarations.0.type="VariableDeclarator"]'
].join('');

const isDefaultExpression = (left, right) =>
	left &&
	right &&
	left.type === 'Identifier' &&
	right.type === 'LogicalExpression' &&
	(right.operator === '||' || right.operator === '??') &&
	right.left.type === 'Identifier' &&
	right.right.type === 'Literal';

const needsParentheses = (source, function_) => {
	if (function_.type !== 'ArrowFunctionExpression' || function_.params.length > 1) {
		return false;
	}

	const [parameter] = function_.params;
	const before = source.getTokenBefore(parameter);
	const after = source.getTokenAfter(parameter);

	return !after || !before || before.value !== '(' || after.value !== ')';
};

const fixDefaultExpression = (fixer, source, node) => {
	const {line} = source.getLocFromIndex(node.range[0]);
	const {column} = source.getLocFromIndex(node.range[1]);
	const nodeText = source.getText(node);
	const lineText = source.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;
	const endsWithWhitespace = lineText[column] === ' ';

	if (isOnlyNodeOnLine) {
		return fixer.removeRange([
			source.getIndexFromLoc({line, column: 0}),
			source.getIndexFromLoc({line: line + 1, column: 0})
		]);
	}

	if (endsWithWhitespace) {
		return fixer.removeRange([
			node.range[0],
			node.range[1] + 1
		]);
	}

	return fixer.removeRange(node.range);
};

const create = context => {
	const source = context.getSourceCode();
	const functionStack = [];

	const checkExpression = (node, left, right, assignment) => {
		const currentFunction = functionStack[functionStack.length - 1];

		if (!currentFunction || !isDefaultExpression(left, right)) {
			return;
		}

		const {name: firstId} = left;
		const {
			left: {name: secondId},
			right: {raw: literal}
		} = right;

		// Parameter is reassigned to a different identifier
		if (assignment && firstId !== secondId) {
			return;
		}

		const variable = findVariable(context.getScope(), secondId);

		// Parameter is referenced prior to default-assignment
		if (assignment && variable.references[0].identifier !== left) {
			return;
		}

		// Old parameter is still referenced somewhere else
		if (!assignment && variable.references.length > 1) {
			return;
		}

		const parameter = currentFunction.params.find(parameter =>
			parameter.type === 'Identifier' &&
			parameter.name === secondId
		);
		const lastParameter = currentFunction.params[currentFunction.params.length - 1];

		// See 'default-param-last' rule
		if (!parameter || parameter !== lastParameter) {
			return;
		}

		const replacement = needsParentheses(source, currentFunction) ?
			`(${firstId} = ${literal})` :
			`${firstId} = ${literal}`;

		context.report({
			node,
			messageId: MESSAGE_ID,
			suggest: [{
				messageId: MESSAGE_ID_SUGGEST,
				fix: fixer => [
					fixer.replaceText(parameter, replacement),
					fixDefaultExpression(fixer, source, node)
				]
			}]
		});
	};

	return {
		':function': node => {
			functionStack.push(node);
		},
		':function:exit': () => {
			functionStack.pop();
		},
		[assignmentSelector]: node => {
			const {left, right} = node.expression;

			checkExpression(node, left, right, true);
		},
		[declarationSelector]: node => {
			const {id, init} = node.declarations[0];

			checkExpression(node, id, init, false);
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
		messages: {
			[MESSAGE_ID]: 'Prefer default parameters over reassignment.',
			[MESSAGE_ID_SUGGEST]: 'Replace reassignment with default parameter.'
		}
	}
};
