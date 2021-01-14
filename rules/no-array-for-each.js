'use strict';
const {hasSideEffect, isParenthesized, isArrowToken, isCommaToken, isSemicolonToken} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const needsSemicolon = require('./utils/needs-semicolon');
const shouldAddParenthesesToMemberExpressionObject = require('./utils/should-add-parentheses-to-member-expression-object');

const MESSAGE_ID = 'no-array-for-each';
const messages = {
  [MESSAGE_ID]: 'Do not use `Array#forEach(…)`.',
};

const arrayForEachCallSelector = methodSelector({
  name: 'forEach',
  includeOptional: true,
});

const continueAbleNodeTypes = new Set([
	'WhileStatement',
	'DoWhileStatement',
	'ForStatement',
	'ForOfStatement',
	'ForInStatement',
]);

function isReturnStatementInBreakableStatements(returnStatement, callbackFunction) {
	for (let node = returnStatement; node && node !== callbackFunction; node = node.parent) {
		if (continueAbleNodeTypes.has(node.type)) {
			return true;
		}
	}

	return false;
}

function getFixFunction(callExpression, sourceCode, functionReturnStatements) {
	const [callback] = callExpression.arguments;
	const parameters = callback.params;
	const array = callExpression.callee.object;
	const returnStatements = functionReturnStatements.get(callback);

	const getForOfLoopHeadText = () => {
		const parametersText = parameters.map(parameter => sourceCode.getText(parameter));
		let useEntries = parameters.length === 2;

		let text = 'for (const ';
		if (useEntries) {
			text += `[${parametersText.join(', ')}]`;
		} else {
			text += parametersText[0];
		}

		text += ' of ';

		let arrayText = sourceCode.getText(array);
		if (
			isParenthesized(callExpression, sourceCode) ||
			(useEntries && shouldAddParenthesesToMemberExpressionObject(array, sourceCode))
		) {
			arrayText = `(${arrayText})`;
		}

		text += arrayText;

		if (useEntries) {
			text += '.entries()';
		}

		text += ') ';

		return text;
	};

	const getForOfLoopHeadRange = () => {
		const [start] = callExpression.range;
		let end;
		if (callback.body.type === 'BlockStatement') {
			end = callback.body.range[0];
		} else {
			const arrowToken = sourceCode.getFirstToken(callback, isArrowToken);
			end = arrowToken.range[1];
		}

		return [start, end];
	};

	function * replaceReturnStatement(returnStatement, fixer) {
		const returnToken = sourceCode.getFirstToken(returnStatement);

		/* istanbul ignore next: `ReturnStatement` firstToken should be `return` */
		if (returnToken.value !== 'return') {
			throw new Error(`Unexpected token ${returnToken.value}.`)
		}

		if (returnStatement.argument) {
			// Remove `return`
			yield fixer.remove(returnToken);

			// TODO: `.argument` might need `;` or `()`

			// If `returnStatement` has no semi
			const lastToken = sourceCode.getLastToken(returnStatement);
			yield fixer.insertTextAfter(
				returnStatement,
				`${isSemicolonToken(lastToken) ? '' : ';'} continue;`
			);
		} else {
			yield fixer.replaceText(returnToken, 'continue');
		}
	}

	const shouldRemoveExpressionStatementLastToken = (token, fixer) => {
		if (!isSemicolonToken(token)) {
			return false;
		}

		if (callback.body.type === 'BlockStatement') {
			return true;
		}

		const nextToken = sourceCode.getTokenAfter(token);
		if (nextToken && needsSemicolon(token, sourceCode, nextToken.value)) {
			return false;
		}

		return true;
	};


	return function * (fixer) {
		yield fixer.replaceTextRange(getForOfLoopHeadRange(), getForOfLoopHeadText());

		// Remove call expression trailing comma
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(callExpression, 2);
		if (isCommaToken(penultimateToken)) {
			yield fixer.remove(penultimateToken);
		}
		yield fixer.remove(lastToken);

		for(const returnStatement of returnStatements) {
			yield * replaceReturnStatement(returnStatement, fixer);
		}

		const expressionStatementLastToken = sourceCode.getLastToken(callExpression.parent);
		if (shouldRemoveExpressionStatementLastToken(expressionStatementLastToken)) {
			yield fixer.remove(expressionStatementLastToken, fixer);
		}
	};
}

function isFixable(callExpression, sourceCode, functionReturnStatements) {
	// Check `CallExpression`
	if (
		callExpression.optional ||
		isParenthesized(callExpression, sourceCode) ||
		callExpression.arguments.length !== 1
	) {
    return false;
	}

	// Check `CallExpression.parent`
	if (callExpression.parent.type !== 'ExpressionStatement') {
    return false;
	}

	// Check `CallExpression.callee`
	if (callExpression.callee.optional) {
    return false;
	}

	// Check `CallExpression.arguments[0]`;
	const [callback] = callExpression.arguments;
	if (
		// Leave non-function type to `no-array-callback-reference` rule
		(callback.type !== 'FunctionExpression' && callback.type !== 'ArrowFunctionExpression') ||
    callback.async ||
    callback.generator
	) {
    return false;
	}

	// Check `callback.params`
	const parameters = callback.params;
	if (
		!(parameters.length === 1 || parameters.length === 2) ||
		parameters.some(parameter => parameter.type !== 'Identifier')
	) {
		return false;
	}

	// TODO: check parameters conflicts

	// Check `ReturnStatement`s in `callback`
	const returnStatements = functionReturnStatements.get(callback);
	if (returnStatements.some(returnStatement => isReturnStatementInBreakableStatements(returnStatement, callback))) {
		return false;
	}

	// Check `callback` self
	if (callback.type === 'FunctionExpression') {
		// TODO: check `.id` `arguments` `this` of `FunctionExpression`
	}

  return true;
}

const create = (context) => {
	const functionStacks = [];
	const functionReturnStatements = new Map();
	const callExpressions = [];

	const sourceCode = context.getSourceCode();

	const getParenthesizedText = node => {
		const text = sourceCode.getText(node);
		return isParenthesized(node, sourceCode) ? `(${text})` : text;
	};

  return {
		':function'(node) {
			functionStacks.push(node);
			functionReturnStatements.set(node, []);
		},
		':function:exit'(node) {
			functionStacks.pop();
		},
		ReturnStatement(node) {
			const currentFunction = functionStacks[functionStacks.length - 1];
			// `globalReturn `
			/* istanbul ignore next: ESLint deprecated `ecmaFeatures`, can't test */
			if (!currentFunction) {
				return;
			}

			const returnStatements = functionReturnStatements.get(currentFunction);
			returnStatements.push(node);
		},
    [arrayForEachCallSelector](node) {
			callExpressions.push(node);
    },
		'Program:exit'() {
			for (const callExpression of callExpressions) {
				const problem = {
					node: callExpression.callee.property,
					messageId: MESSAGE_ID
				};

				if (isFixable(callExpression, sourceCode, functionReturnStatements)) {
					problem.fix = getFixFunction(callExpression, sourceCode, functionReturnStatements);
				}

				context.report(problem);
			}
		}
  };
};

module.exports = {
  create,
  meta: {
    type: 'suggestion',
    docs: {
      url: getDocumentationUrl(__filename),
    },
    fixable: 'code',
    messages,
  },
};
