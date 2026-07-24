import {
	isCommaToken,
	isSemicolonToken,
	isClosingParenToken,
	findVariable,
	hasSideEffect,
} from '@eslint-community/eslint-utils';
import {
	extendFixRange,
	fixSpaceAroundKeyword,
	removeParentheses,
} from './fix/index.js';
import {
	isArrowFunctionBody,
	isMethodCall,
	isReferenceIdentifier,
	functionTypes,
} from './ast/index.js';
import {
	needsSemicolon,
	shouldAddParenthesesToExpressionStatementExpression,
	shouldAddParenthesesToMemberExpressionObject,
	shouldSkipKnownNonArrayReceiver,
	isArray,
	isParenthesized,
	getParentheses,
	getParenthesizedRange,
	isFunctionSelfUsedInside,
	isNodeMatches,
	assertToken,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-for-each/error';
const MESSAGE_ID_SUGGESTION = 'no-for-each/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Use `for…of` instead of `.forEach(…)`.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `for…of`.',
};

const continueAbleNodeTypes = new Set([
	'WhileStatement',
	'DoWhileStatement',
	'ForStatement',
	'ForOfStatement',
	'ForInStatement',
]);

const stripChainExpression = node =>
	(node.parent.type === 'ChainExpression' && node.parent.expression === node)
		? node.parent
		: node;

function isReturnStatementInContinueAbleNodes(returnStatement, callbackFunction) {
	for (let node = returnStatement; node && node !== callbackFunction; node = node.parent) {
		if (continueAbleNodeTypes.has(node.type)) {
			return true;
		}
	}

	return false;
}

function shouldSwitchReturnStatementToBlockStatement(returnStatement) {
	const {parent} = returnStatement;

	switch (parent.type) {
		case 'IfStatement': {
			return parent.consequent === returnStatement || parent.alternate === returnStatement;
		}

		// These parent's body need switch to `BlockStatement` too, but since they are "continueAble", won't fix
		// case 'ForStatement':
		// case 'ForInStatement':
		// case 'ForOfStatement':
		// case 'WhileStatement':
		// case 'DoWhileStatement':
		case 'WithStatement': {
			return parent.body === returnStatement;
		}

		default: {
			return false;
		}
	}
}

function getFixFunction(callExpression, functionInfo, context) {
	const {sourceCode} = context;
	const [callback] = callExpression.arguments;
	const parameters = callback.params;
	const iterableObject = callExpression.callee.object;
	const {returnStatements} = functionInfo.get(callback);
	const isOptionalObject = callExpression.callee.optional;
	const ancestor = stripChainExpression(callExpression).parent;
	const objectText = sourceCode.getText(iterableObject);

	const getForOfLoopHeadText = () => {
		const [elementText, indexText] = parameters.map(parameter => sourceCode.getText(parameter));
		const shouldUseEntries = parameters.length === 2;

		let text = 'for (';
		text += isFunctionParameterVariableReassigned(callback, sourceCode) ? 'let' : 'const';
		text += ' ';
		text += shouldUseEntries ? `[${indexText}, ${elementText}]` : elementText;
		text += ' of ';

		const shouldAddParenthesesToObject
			= isParenthesized(iterableObject, context)
				|| (
				// `1?.forEach()` -> `(1).entries()`
					isOptionalObject
					&& shouldUseEntries
					&& shouldAddParenthesesToMemberExpressionObject(iterableObject, context)
				);

		text += shouldAddParenthesesToObject ? `(${objectText})` : objectText;

		if (shouldUseEntries) {
			text += '.entries()';
		}

		text += ') ';

		return text;
	};

	const getForOfLoopHeadRange = () => {
		const [start] = sourceCode.getRange(callExpression);
		const [end] = getParenthesizedRange(callback.body, context);
		return [start, end];
	};

	function * replaceReturnStatement(returnStatement, fixer) {
		const returnToken = sourceCode.getFirstToken(returnStatement);
		assertToken(returnToken, {
			expected: 'return',
			ruleId: 'no-for-each',
		});

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
		const shouldAddParentheses
			= !isParenthesized(returnStatement.argument, context)
				&& shouldAddParenthesesToExpressionStatementExpression(returnStatement.argument);
		if (shouldAddParentheses) {
			textBefore = `(${textBefore}`;
			textAfter += ')';
		}

		const insertBraces = shouldSwitchReturnStatementToBlockStatement(returnStatement);
		if (insertBraces) {
			textBefore = `{ ${textBefore}`;
		} else if (needsSemicolon(previousToken, context, shouldAddParentheses ? '(' : nextToken.value)) {
			textBefore = `;${textBefore}`;
		}

		if (textBefore) {
			yield fixer.insertTextBefore(nextToken, textBefore);
		}

		if (textAfter) {
			yield fixer.insertTextAfter(returnStatement.argument, textAfter);
		}

		const returnStatementHasSemicolon = isSemicolonToken(sourceCode.getLastToken(returnStatement));
		if (!returnStatementHasSemicolon) {
			yield fixer.insertTextAfter(returnStatement, ';');
		}

		yield fixer.insertTextAfter(returnStatement, ' continue;');

		if (insertBraces) {
			yield fixer.insertTextAfter(returnStatement, ' }');
		}
	}

	const shouldRemoveExpressionStatementLastToken = token => {
		if (!isSemicolonToken(token)) {
			return false;
		}

		return callback.body.type === 'BlockStatement';
	};

	function * removeCallbackParentheses(fixer) {
		// Opening parenthesis tokens already included in `getForOfLoopHeadRange`
		const closingParenthesisTokens = getParentheses(callback, context)
			.filter(token => isClosingParenToken(token));

		for (const closingParenthesisToken of closingParenthesisTokens) {
			yield fixer.remove(closingParenthesisToken);
		}
	}

	return function * (fixer) {
		// `(( foo.forEach(bar => bar) ))`
		yield removeParentheses(callExpression, fixer, context);

		// Replace these with `for (const … of …) `
		// foo.forEach(bar =>    bar)
		// ^^^^^^^^^^^^^^^^^^^^^^
		// foo.forEach(bar =>    (bar))
		// ^^^^^^^^^^^^^^^^^^^^^^
		// foo.forEach(bar =>    {})
		// ^^^^^^^^^^^^^^^^^^^^^^
		// foo.forEach(function(bar)    {})
		// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		yield fixer.replaceTextRange(getForOfLoopHeadRange(), getForOfLoopHeadText());

		// Parenthesized callback function
		// foo.forEach( ((bar => {})) )
		//                         ^^
		yield removeCallbackParentheses(fixer);

		const [
			penultimateToken,
			lastToken,
		] = sourceCode.getLastTokens(callExpression, 2);

		// The possible trailing comma token of `Array#forEach()` CallExpression
		// foo.forEach(bar => {},)
		//                      ^
		if (isCommaToken(penultimateToken)) {
			yield fixer.remove(penultimateToken);
		}

		// The closing parenthesis token of `Array#forEach()` CallExpression
		// foo.forEach(bar => {})
		//                      ^
		yield fixer.remove(lastToken);

		for (const returnStatement of returnStatements) {
			yield replaceReturnStatement(returnStatement, fixer);
		}

		if (ancestor.type === 'ExpressionStatement') {
			const expressionStatementLastToken = sourceCode.getLastToken(ancestor);
			// Remove semicolon if it's not needed anymore
			// foo.forEach(bar => {});
			//                       ^
			if (shouldRemoveExpressionStatementLastToken(expressionStatementLastToken)) {
				yield fixer.remove(expressionStatementLastToken, fixer);
			}
		} else if (ancestor.type === 'ArrowFunctionExpression') {
			yield fixer.insertTextBefore(callExpression, '{ ');
			yield fixer.insertTextAfter(callExpression, ' }');
		}

		yield fixSpaceAroundKeyword(fixer, callExpression.parent, context);

		if (isOptionalObject) {
			yield fixer.insertTextBefore(callExpression, `if (${objectText}) `);
		}

		// Prevent possible variable conflicts
		yield extendFixRange(fixer, sourceCode.getRange(callExpression.parent));
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

/*
Collect the reference identifiers inside `node`, keyed by name. Only identifiers inside the `.forEach()` call are ever looked up, and most files contain no `.forEach()` at all, so this walks the call's subtree when a candidate is checked instead of collecting every identifier in the file up front.
*/
function getReferenceIdentifiersByName(node, visitorKeys) {
	const identifiersByName = new Map();

	const walk = node => {
		if (node.type === 'Identifier' && isReferenceIdentifier(node)) {
			const identifiers = identifiersByName.get(node.name);
			if (identifiers) {
				identifiers.push(node);
			} else {
				identifiersByName.set(node.name, [node]);
			}
		}

		for (const key of visitorKeys[node.type] ?? []) {
			const value = node[key];

			if (Array.isArray(value)) {
				for (const child of value) {
					if (child?.type) {
						walk(child);
					}
				}
			} else if (value?.type) {
				walk(value);
			}
		}
	};

	walk(node);

	return identifiersByName;
}

function isFunctionParametersSafeToFix(callbackFunction, {sourceCode, scope, callExpression}) {
	const variables = sourceCode.getDeclaredVariables(callbackFunction);
	let identifiersByName;

	for (const variable of variables) {
		if (variable.defs.length !== 1) {
			return false;
		}

		const [definition] = variable.defs;
		if (definition.type !== 'Parameter') {
			continue;
		}

		identifiersByName ??= getReferenceIdentifiersByName(callExpression, sourceCode.visitorKeys);
		for (const identifier of identifiersByName.get(definition.name.name) ?? []) {
			const referencedVariable = findVariable(scope, identifier);
			if (!referencedVariable || referencedVariable.scope === scope || isChildScope(scope, referencedVariable.scope)) {
				return false;
			}
		}
	}

	return true;
}

function isFunctionParameterVariableReassigned(callbackFunction, sourceCode) {
	return sourceCode.getDeclaredVariables(callbackFunction)
		.filter(variable => variable.defs[0].type === 'Parameter')
		.some(variable =>
			variable.references.some(reference => !reference.init && reference.isWrite()));
}

function isFixable(callExpression, {scope, functionInfo, sourceCode}) {
	// Check `CallExpression`
	if (callExpression.optional || callExpression.arguments.length !== 1) {
		return false;
	}

	// Check ancestors, we only fix `ExpressionStatement`
	const callOrChainExpression = stripChainExpression(callExpression);
	if (
		callOrChainExpression.parent.type !== 'ExpressionStatement'
		&& !isArrowFunctionBody(callOrChainExpression)
	) {
		return false;
	}

	// Check `CallExpression.arguments[0]`;
	const [callback] = callExpression.arguments;
	if (
		// Leave non-function type to `no-array-callback-reference` rule
		(callback.type !== 'FunctionExpression' && callback.type !== 'ArrowFunctionExpression')
		|| callback.async
		|| callback.generator
	) {
		return false;
	}

	// Check `callback.params`
	const parameters = callback.params;
	if (
		!(parameters.length === 1 || parameters.length === 2)
		// `array.forEach((element = defaultValue) => {})`
		|| (parameters.length === 1 && parameters[0].type === 'AssignmentPattern')
		// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1814
		|| (parameters.length === 2 && parameters[1].type !== 'Identifier')
		|| parameters.some(({type, typeAnnotation}) => type === 'RestElement' || typeAnnotation)
		|| !isFunctionParametersSafeToFix(callback, {
			scope,
			callExpression,
			sourceCode,
		})
	) {
		return false;
	}

	// Check `ReturnStatement`s in `callback`
	const {returnStatements} = functionInfo.get(callback);
	if (returnStatements.some(returnStatement => isReturnStatementInContinueAbleNodes(returnStatement, callback))) {
		return false;
	}

	return !isFunctionSelfUsedInside(callback, sourceCode.getScope(callback));
}

const ignoredObjects = [
	'React.Children',
	'Children',
	'R',
	// https://www.npmjs.com/package/p-iteration
	'pIteration',
	// https://www.npmjs.com/package/effect
	'Effect',
];

const strictCallbagBasicsPackage = 'strict-callbag-basics';

function isStrictCallbagBasicsNamespace(node, scope) {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(scope, node);
	return variable?.defs.some(definition =>
		definition.type === 'ImportBinding'
		&& definition.node.type === 'ImportNamespaceSpecifier'
		&& definition.parent.source.value === strictCallbagBasicsPackage) ?? false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const functionStack = [];
	const callExpressions = [];
	const functionInfo = new Map();
	const {sourceCode} = context;

	context.on(functionTypes, node => {
		functionStack.push(node);
		functionInfo.set(node, {returnStatements: []});
	});

	context.onExit(functionTypes, () => {
		functionStack.pop();
	});

	context.on('ReturnStatement', node => {
		const currentFunction = functionStack.at(-1);
		if (!currentFunction) {
			return;
		}

		const {returnStatements} = functionInfo.get(currentFunction);
		returnStatements.push(node);
	});

	context.on('CallExpression', node => {
		// Check the cheap method-call shape before resolving scope, so the scope lookup
		// runs only for actual `.forEach()` calls.
		if (
			!isMethodCall(node, {
				method: 'forEach',
			})
			|| isNodeMatches(node.callee.object, ignoredObjects)
		) {
			return;
		}

		const scope = sourceCode.getScope(node);
		if (
			isStrictCallbagBasicsNamespace(node.callee.object, scope)
			|| shouldSkipKnownNonArrayReceiver(node.callee.object, context)
		) {
			return;
		}

		callExpressions.push({
			node,
			scope,
			isKnownArrayReceiver: isArray(node.callee.object, context),
		});
	});

	context.onExit('Program', function * () {
		for (const {node, scope, isKnownArrayReceiver} of callExpressions) {
			const iterable = node.callee;

			const problem = {
				node: iterable.property,
				messageId: MESSAGE_ID_ERROR,
			};

			if (
				!isKnownArrayReceiver
				|| !isFixable(node, {
					scope,
					functionInfo,
					sourceCode,
				})
			) {
				yield problem;
				continue;
			}

			const shouldUseSuggestion = iterable.optional && hasSideEffect(iterable, sourceCode);
			const fix = getFixFunction(node, functionInfo, context);

			if (shouldUseSuggestion) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix,
					},
				];
			} else {
				problem.fix = fix;
			}

			yield problem;
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `for…of` over the `forEach` method.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
