'use strict';
const { hasSideEffect, isParenthesized } = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const avoidCapture = require('./avoid-capture');

const MESSAGE_ID = 'no-array-for-each';
const messages = {
  [MESSAGE_ID]: 'Do not use `Array#forEach(…)`.',
};

const arrayForEachCallSelector = methodSelector({
  name: 'forEach',
  includeOptional: true,
});

const breakableTypePattern = /^(?:(?:Do)?While|For(?:In|Of)?|Switch)Statement$/u;
function isReturnStatementInBreakableStatements(node, callbackFunction) {
	for (let parent = node; parent && parent !== callbackFunction; parent = node.parent) {
		if (breakableTypePattern.test(node.type)) {
			return true;
		}
	}

	return false;
}

function getFix(node, getParenthesizedText, functions) {
  const {
    parent,
    arguments: callArguments,
    callee: { object: array, property: method },
  } = node;

  if (
    parent.type !== 'ExpressionStatement' ||
    isParenthesized(node) ||
    callArguments.length !== 1 ||
    callee.optional ||
    hasSideEffect(callee)
  ) {
    return;
  }

  const [callback] = callArguments;
	const returnStatements = functions.get(callback);
	const parameters = callback.params;

  if (
  	// Leave non-function type to `no-array-callback-reference` rule
    callback.type !== 'FunctionExpression' ||
    callback.type !== 'ArrowFunctionExpression' ||
    callback.async ||
    callback.generator ||
		returnStatements.some(returnStatement => isReturnStatementInBreakableStatements(returnStatement, callback)) ||
		parameters.length > 2 ||
		parameters.some(parameter => parameters.type === 'RestElement')
  ) {
    return;
  }

	// TODO: check `FunctionExpression`'s `.id` `arguments` `this`

	return function * (fixer) {
		const scopes = [];

		let useEntries = parameters.length === 2;
		const variables = (
			parameters.length === 2 ? ['index', 'element'] : ['element']
		).map(name => avoidCapture(name, scopes, ecmaVersion));

		const forOfLoopHead = [
			'for (const '
		];
		if (useEntries) {
			forOfLoopHead.push(`[${variables.join(', ')}]`)
		} else {
			forOfLoopHead.push(variables[0])
		}

		forOfLoopHead.push(' of ');
		if (useEntries) {
			forOfLoopHead.push(`${getParenthesizedText(array)}.entries()`);
		} else {
			forOfLoopHead.push(getParenthesizedText(array));
		}

		forOfLoopHead.push(')');

		const [start] = node.range;
		const [end] = callback.body.range;

		yield fixer.replaceTextRange([start, end], forOfLoopHead.join(''));

		// Remove call expression trailing comma
	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
  if (isCommaTOken(penultimateToken)) {
		yield fixer.remove(penultimateToken);
	}

	yield fixer.remove(lastToken);

	for(const returnStatement of returnStatements) {
		const returnToken = sourceCode.getFirstToken(returnStatement);
		if (returnStatement.argument) {
			// Remove `return`
			yield fixer.remove(returnToken);

			// If `returnStatement` has no semi
			const lastToken = sourceCode.getLastTokens(returnStatement);
			yield fixer.insertTextAfter(returnStatement,
				`${isSemiToken(lastToken) ? '' : ';'}break;`
			);
		} else {
			yield fixer.replace(returnStatement, 'break');
		}
	}
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
			// Global return
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
			for (const node of callExpressions) {
				context.report({
					node: node.callee.property,
					messageId: MESSAGE_ID,
					fix: getFix(node, getParenthesizedText, functions)
				});
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
