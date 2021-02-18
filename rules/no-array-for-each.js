'use strict';
const {
	isParenthesized,
	isArrowToken,
	isCommaToken,
	isSemicolonToken,
	isClosingParenToken,
	findVariable
} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const needsSemicolon = require('./utils/needs-semicolon');
const shouldAddParenthesesToExpressionStatementExpression = require('./utils/should-add-parentheses-to-expression-statement-expression');
const getParenthesizedTimes = require('./utils/get-parenthesized-times');
const extendFixRange = require('./utils/extend-fix-range');
const isFunctionSelfUsedInside = require('./utils/is-function-self-used-inside');
const isNodeMatches = require('./utils/is-node-matches');

const MESSAGE_ID = 'no-array-for-each';
const messages = {
	[MESSAGE_ID]: 'Do not use `Array#forEach(…)`.'
};

const arrayForEachCallSelector = methodSelector({
	name: 'forEach',
	includeOptional: true
});

const continueAbleNodeTypes = new Set([
	'WhileStatement',
	'DoWhileStatement',
	'ForStatement',
	'ForOfStatement',
	'ForInStatement'
]);

function isReturnStatementInContinueAbleNodes(returnStatement, callbackFunction) {
	for (let node = returnStatement; node && node !== callbackFunction; node = node.parent) {
		if (continueAbleNodeTypes.has(node.type)) {
			return true;
		}
	}

	return false;
}

function getFixFunction(callExpression, sourceCode, functionInfo) {
	const [callback] = callExpression.arguments;
	const parameters = callback.params;
	const array = callExpression.callee.object;
	const {returnStatements} = functionInfo.get(callback);

	const getForOfLoopHeadText = () => {
		const [elementText, indexText] = parameters.map(parameter => sourceCode.getText(parameter));
		const useEntries = parameters.length === 2;

		let text = 'for (const ';
		text += useEntries ? `[${indexText}, ${elementText}]` : elementText;

		text += ' of ';

		let arrayText = sourceCode.getText(array);
		if (isParenthesized(array, sourceCode)) {
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
			const arrowToken = sourceCode.getTokenBefore(callback.body, isArrowToken);
			end = arrowToken.range[1];
		}

		return [start, end];
	};

	function * replaceReturnStatement(returnStatement, fixer) {
		const returnToken = sourceCode.getFirstToken(returnStatement);

		/* istanbul ignore next: `ReturnStatement` firstToken should be `return` */
		if (returnToken.value !== 'return') {
			throw new Error(`Unexpected token ${returnToken.value}.`);
		}

		if (!returnStatement.argument) {
			yield fixer.replaceText(returnToken, 'continue');
			return;
		}

		// Remove `return`
		yield fixer.remove(returnToken);

		const previousToken = sourceCode.getTokenBefore(returnToken);
		const nextToken = sourceCode.getTokenAfter(returnToken);
		let textBefore = '';
		let textAfter = '';
		const shouldAddParentheses =
			!isParenthesized(returnStatement.argument, sourceCode) &&
			shouldAddParenthesesToExpressionStatementExpression(returnStatement.argument);
		if (shouldAddParentheses) {
			textBefore = '(';
			textAfter = ')';
		}

		const shouldAddSemicolonBefore = needsSemicolon(previousToken, sourceCode, shouldAddParentheses ? '(' : nextToken.value);
		if (shouldAddSemicolonBefore) {
			textBefore = `;${textBefore}`;
		}

		if (textBefore) {
			yield fixer.insertTextBefore(nextToken, textBefore);
		}

		if (textAfter) {
			yield fixer.insertTextAfter(returnStatement.argument, textAfter);
		}

		// If `returnStatement` has no semi
		const lastToken = sourceCode.getLastToken(returnStatement);
		yield fixer.insertTextAfter(
			returnStatement,
			`${isSemicolonToken(lastToken) ? '' : ';'} continue;`
		);
	}

	const shouldRemoveExpressionStatementLastToken = token => {
		if (!isSemicolonToken(token)) {
			return false;
		}

		if (callback.body.type !== 'BlockStatement') {
			return false;
		}

		return true;
	};

	function * removeCallbackParentheses(fixer) {
		const parenthesizedTimes = getParenthesizedTimes(callback, sourceCode);
		if (parenthesizedTimes > 0) {
			// Opening parenthesis tokens already included in `getForOfLoopHeadRange`

			const closingParenthesisTokens = sourceCode.getTokensAfter(
				callback,
				{count: parenthesizedTimes, filter: isClosingParenToken}
			);

			for (const closingParenthesisToken of closingParenthesisTokens) {
				yield fixer.remove(closingParenthesisToken);
			}
		}
	}

	return function * (fixer) {
		yield fixer.replaceTextRange(getForOfLoopHeadRange(), getForOfLoopHeadText());

		yield * removeCallbackParentheses(fixer);

		// Remove call expression trailing comma
		const [
			penultimateToken,
			lastToken
		] = sourceCode.getLastTokens(callExpression, 2);

		if (isCommaToken(penultimateToken)) {
			yield fixer.remove(penultimateToken);
		}

		yield fixer.remove(lastToken);

		for (const returnStatement of returnStatements) {
			yield * replaceReturnStatement(returnStatement, fixer);
		}

		const expressionStatementLastToken = sourceCode.getLastToken(callExpression.parent);
		if (shouldRemoveExpressionStatementLastToken(expressionStatementLastToken)) {
			yield fixer.remove(expressionStatementLastToken, fixer);
		}

		// Prevent possible conflicts
		yield * extendFixRange(fixer, callExpression.parent.range);
	};
}

const isChildScope = (child, parent) => {
	for (let scope = child; scope; scope = scope.upper) {
		if (scope === parent) {
			return true;
		}
	}

	return false;
};

function isParameterSafeToFix(parameter, {scope, array, allIdentifiers}) {
	const {type, name: parameterName} = parameter;
	if (type !== 'Identifier') {
		return false;
	}

	const [arrayStart, arrayEnd] = array.range;
	for (const identifier of allIdentifiers) {
		const {name, range: [start, end], parent} = identifier;
		if (
			name !== parameterName ||
			start < arrayStart ||
			end > arrayEnd
		) {
			continue;
		}

		if (
			(
				(
					parent.type === 'FunctionExpression' ||
					parent.type === 'ClassExpression' ||
					parent.type === 'FunctionDeclaration' ||
					parent.type === 'ClassDeclaration'
				) &&
				parent.id === identifier
			) ||
			(
				parent.type === 'MemberExpression' &&
				!parent.computed &&
				parent.property === identifier
			) ||
			(
				parent.type === 'Property' &&
				!parent.shorthand &&
				!parent.computed &&
				parent.key === identifier
			)
		) {
			continue;
		}

		const variable = findVariable(scope, identifier);
		if (!variable || variable.scope === scope || isChildScope(scope, variable.scope)) {
			return false;
		}
	}

	return true;
}

function isFixable(callExpression, sourceCode, {scope, functionInfo, allIdentifiers}) {
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
	/* istanbul ignore next: Because of `ChainExpression` wrapper, `foo?.forEach()` is already failed on previous check, keep this just for safety */
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
		parameters.some(parameter => !isParameterSafeToFix(parameter, {scope, array: callExpression, allIdentifiers}))
	) {
		return false;
	}

	// `foo.forEach((element: Type, index: number) => bar())`, should fix to `for (const [index, element]: [number, Type] of …`, not handled
	if (parameters.length === 2 && parameters.some(node => node.typeAnnotation)) {
		return false;
	}

	// Check `ReturnStatement`s in `callback`
	const {returnStatements, scope: callbackScope} = functionInfo.get(callback);
	if (returnStatements.some(returnStatement => isReturnStatementInContinueAbleNodes(returnStatement, callback))) {
		return false;
	}

	if (isFunctionSelfUsedInside(callback, callbackScope)) {
		return false;
	}

	return true;
}

const ignoredObjects = [
	'React.Children',
	'Children'
];

const create = context => {
	const functionStack = [];
	const callExpressions = [];
	const allIdentifiers = [];
	const functionInfo = new Map();

	const sourceCode = context.getSourceCode();

	return {
		':function'(node) {
			functionStack.push(node);
			functionInfo.set(node, {
				returnStatements: [],
				scope: context.getScope()
			});
		},
		':function:exit'() {
			functionStack.pop();
		},
		Identifier(node) {
			allIdentifiers.push(node);
		},
		ReturnStatement(node) {
			const currentFunction = functionStack[functionStack.length - 1];
			// `globalReturn`
			/* istanbul ignore next: ESLint deprecated `ecmaFeatures`, can't test */
			if (!currentFunction) {
				return;
			}

			const {returnStatements} = functionInfo.get(currentFunction);
			returnStatements.push(node);
		},
		[arrayForEachCallSelector](node) {
			if (isNodeMatches(node.callee.object, ignoredObjects)) {
				return;
			}

			callExpressions.push({
				node,
				scope: context.getScope()
			});
		},
		'Program:exit'() {
			for (const {node, scope} of callExpressions) {
				const problem = {
					node: node.callee.property,
					messageId: MESSAGE_ID
				};

				if (isFixable(node, sourceCode, {scope, allIdentifiers, functionInfo})) {
					problem.fix = getFixFunction(node, sourceCode, functionInfo);
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
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
