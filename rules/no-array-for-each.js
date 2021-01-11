'use strict';
const { hasSideEffect, isParenthesized } = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

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

  if (
  	// Leave non-function type to `no-array-callback-reference` rule
    callback.type !== 'FunctionExpression' ||
    callback.type !== 'ArrowFunctionExpression' ||
    callback.async ||
    callback.generator ||
		!functions.get(callback)
  ) {
    return;
  }

	const parameters = callback.params;

	if (
	parameters.length > 3 ||
	parameters.some(
		parameter => parameters.type === 'RestElement'
	)
	) {
		return;
	}


	return function(fixer) {


	}

	// TODO: check if parameter name available
	const arrayText = getParenthesizedText(array);
	const fixed = [];
	if (parameters.length > 1) {
		fixed.push(`const [${getParenthesizedText(parameter[0])}, ${getParenthesizedText(parameter[1])}] of ${getParenthesizedText(array)}.entries()) {`)
	} else {
		fixed.push(`const [${getParenthesizedText(parameter[0])}] of ${getParenthesizedText(array)}) {`)
	}

	const {body} = callback;
	if (!Array.isArray(body)) {
		fixed.push(`{${getParenthesizedText(body)}}`);
	}

}

const create = (context) => {
	const callExpressions = [];
	const functionStacks = [];
	const functions = new Map();
	const sourceCode = context.getSourceCode();

	const markFunctionNotFixable = () => {
		const currentFunction = functionStacks[functionStacks.length - 1];
		// Top level `return`
		if (!currentFunction) {
			return;
		}

		const canFix = functionReturnStatements.get(currentFunction);
		if (!canFix) {
			return;
		}

		functionReturnStatements.set(currentFunction, false);
	};

	const getParenthesizedText = node => {
		const text = sourceCode.getText(node);
		return isParenthesized(node, sourceCode) ? `(${text})` : text;
	};

  return {
		':function'(node) {
			functionStacks.push(node);
			functionReturnStatements.set(node, true);
		},
		':function:exit'(node) {
			functionStacks.pop();
		},
		ReturnStatement(node) {
			const currentFunction = functionStacks[functionStacks.length - 1];
			if (!currentFunction || !isReturnStatementInBreakableStatements(node, currentFunction)) {
				return;
			}

			markFunctionNotFixable();
		},
		ThisExpression(node) {
			const currentFunction = functionStacks[functionStacks.length - 1];
			if (!currentFunction || currentFunction.type === 'FunctionExpression') {
				return;
			}

			markFunctionNotFixable();
		},
		'Identifier[name="arguments"]'(node) {
			const currentFunction = functionStacks[functionStacks.length - 1];
			if (!currentFunction || currentFunction.type === 'FunctionExpression') {
				return;
			}

			markFunctionNotFixable();
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
