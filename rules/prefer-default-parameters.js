'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'preferDefaultParameters';

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
	right.left.type === 'Identifier' &&
	right.right.type === 'Literal';

const needsParentheses = (source, func) => {
	if (func.type !== 'ArrowFunctionExpression' || func.params.length > 1) {
		return false;
	}

	const [parameter] = func.params;
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
	let currentFunction;

	const checkExpression = (node, left, right, assignment) => {
		if (!currentFunction || !isDefaultExpression(left, right)) {
			return;
		}

		const {name: firstId} = left;
		const {
			left: {name: secondId},
			right: {raw: literal}
		} = right;

		// Check if literal is assigned to the same identifier
		if (assignment && firstId !== secondId) {
			return;
		}

		const parameter = currentFunction.params.find(parameter =>
			parameter.type === 'Identifier' &&
			parameter.name === secondId
		);

		if (!parameter) {
			return;
		}

		const replacement = needsParentheses(source, currentFunction) ?
			`(${firstId} = ${literal})` :
			`${firstId} = ${literal}`;

		context.report({
			node,
			messageId: MESSAGE_ID,
			fix: fixer => [
				fixer.replaceText(parameter, replacement),
				fixDefaultExpression(fixer, source, node)
			]
		});
	};

	return {
		FunctionDeclaration: node => {
			currentFunction = node;
		},
		ArrowFunctionExpression: node => {
			currentFunction = node;
		},
		'FunctionDeclaration:exit': () => {
			currentFunction = undefined;
		},
		'ArrowFunctionExpression:exit': () => {
			currentFunction = undefined;
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
			[MESSAGE_ID]: 'Prefer default parameters over reassignment.'
		}
	}
};
