import {getPropertyName} from '@eslint-community/eslint-utils';
import {isDirective} from './ast/index.js';
import {
	getIndentString,
	getParenthesizedText,
	getReferences,
	containsSuspensionPoint,
	isCallExpressionValueDiscardedWithVoid,
	isParenthesized,
	isPromiseType,
	shouldAddParenthesesToAwaitExpressionArgument,
	unwrapTypeScriptExpression,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-await';
const SUGGESTION_ID = 'prefer-await/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `await` over promise chaining with `.{{method}}()`.',
	[SUGGESTION_ID]: 'Rewrite as an async IIFE.',
};

const promiseMethods = new Set(['then', 'catch', 'finally']);

function isPromiseObject(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		return isPromiseType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this rule best-effort.
	}
}

function hasPromiseMethodCallInChain(node, context) {
	while (true) {
		node = unwrapTypeScriptExpression(node);
		if (node.type === 'ChainExpression') {
			node = node.expression;
			continue;
		}

		if (node.type === 'CallExpression') {
			const {callee} = node;
			if (
				callee.type === 'MemberExpression'
				&& promiseMethods.has(getPropertyName(callee, context.sourceCode.getScope(node)))
			) {
				return true;
			}

			node = callee;
			continue;
		}

		if (node.type === 'MemberExpression') {
			node = node.object;
			continue;
		}

		return false;
	}
}

function getAwaitArgumentText(node, context) {
	let text = getParenthesizedText(node, context);
	if (
		!isParenthesized(node, context)
		&& shouldAddParenthesesToAwaitExpressionArgument(node)
	) {
		text = `(${text})`;
	}

	return text;
}

function hasCallbackBindingConflict(promiseObject, callback, context) {
	const [start, end] = context.sourceCode.getRange(promiseObject);
	const referencedNames = new Set(
		getReferences(context.sourceCode.getScope(promiseObject))
			.filter(reference => {
				const [referenceStart, referenceEnd] = context.sourceCode.getRange(reference.identifier);
				return referenceStart >= start && referenceEnd <= end;
			})
			.map(reference => reference.identifier.name),
	);

	return context.sourceCode.getScope(callback).variables.some(variable => referencedNames.has(variable.name));
}

function isAtStartOfLine(node, context) {
	const {line, column} = context.sourceCode.getLoc(node).start;
	return context.sourceCode.lines[line - 1].slice(0, column).trim() === '';
}

function containsAwaitIdentifier(node, visitorKeys) {
	if (node.type === 'Identifier' && node.name === 'await') {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const child = node[key];
		for (const childNode of Array.isArray(child) ? child : [child]) {
			if (childNode?.type && containsAwaitIdentifier(childNode, visitorKeys)) {
				return true;
			}
		}
	}

	return false;
}

function containsNonModuleAwaitIdentifier(node, context) {
	return context.sourceCode.ast.sourceType !== 'module'
		&& containsAwaitIdentifier(node, context.sourceCode.visitorKeys);
}

function getChildIndent(callExpression, callback, context) {
	const {sourceCode} = context;
	const indent = getIndentString(callExpression, context);
	if (callback.body.type === 'BlockStatement') {
		const openingBrace = sourceCode.getFirstToken(callback.body);
		const closingBrace = sourceCode.getLastToken(callback.body);
		const firstBodyToken = sourceCode.getTokenAfter(openingBrace, {includeComments: true});
		if (
			firstBodyToken !== closingBrace
			&& sourceCode.getLoc(firstBodyToken).start.line > sourceCode.getLoc(openingBrace).start.line
		) {
			return getIndentString(firstBodyToken, context);
		}
	}

	for (let ancestor = callExpression.parent.parent; ancestor; ancestor = ancestor.parent) {
		if (!isAtStartOfLine(ancestor, context)) {
			continue;
		}

		const ancestorIndent = getIndentString(ancestor, context);
		if (ancestorIndent.length < indent.length && indent.startsWith(ancestorIndent)) {
			return `${indent}${indent.slice(ancestorIndent.length)}`;
		}
	}

	return `${indent}\t`;
}

function canSuggestForCall(callExpression, context) {
	const {callee} = callExpression;
	return !callExpression.optional
		&& !callee.optional
		&& !callee.computed
		&& callee.property.type === 'Identifier'
		&& callee.property.name === 'then'
		&& callExpression.arguments.length === 1
		&& callExpression.parent.type === 'ExpressionStatement'
		&& isAtStartOfLine(callExpression, context)
		&& !containsNonModuleAwaitIdentifier(callee.object, context)
		&& !containsSuspensionPoint(callee.object, context.sourceCode.visitorKeys)
		&& !hasPromiseMethodCallInChain(callee.object, context);
}

function canSuggestForCallback(callback, callExpression, context) {
	if (callback.type !== 'ArrowFunctionExpression') {
		return false;
	}

	const {callee} = callExpression;
	const [parameter] = callback.params;
	return callback.params.length <= 1
		&& !callback.typeParameters
		&& !callback.returnType
		&& (
			!parameter
			|| (
				parameter.type === 'Identifier'
				&& parameter.name !== 'let'
				&& !parameter.optional
			)
		)
		&& !containsNonModuleAwaitIdentifier(callback, context)
		&& !(callback.body.type === 'BlockStatement' && callback.body.body.some(statement => isDirective(statement)))
		&& !wouldRemoveComments(context, callExpression, [callee.object, ...callback.params, callback.body]);
}

function getSuggestion(callExpression, context) {
	if (!canSuggestForCall(callExpression, context)) {
		return;
	}

	const {callee} = callExpression;
	const [callback] = callExpression.arguments;
	if (
		!canSuggestForCallback(callback, callExpression, context)
		|| hasCallbackBindingConflict(callee.object, callback, context)
	) {
		return;
	}

	const [parameter] = callback.params;
	const awaitArgumentText = getAwaitArgumentText(callee.object, context);
	let initialStatement;
	if (parameter) {
		const parameterVariable = context.sourceCode.getDeclaredVariables(callback)
			.find(variable => variable.identifiers.includes(parameter));
		if (!parameterVariable || parameterVariable.identifiers.length > 1) {
			return;
		}

		const kind = parameterVariable.references.some(reference => !reference.init && reference.isWrite()) ? 'let' : 'const';
		initialStatement = `${kind} ${context.sourceCode.getText(parameter)} = await ${awaitArgumentText};`;
	} else {
		initialStatement = `await ${awaitArgumentText};`;
	}

	const bodyText = callback.body.type === 'BlockStatement'
		? context.sourceCode.getText(callback.body).slice(1, -1).trim()
		: `return ${getParenthesizedText(callback.body, context)};`;
	const indent = getIndentString(callExpression, context);
	const childIndent = getChildIndent(callExpression, callback, context);
	const replacement = [
		'void (async () => {',
		`${childIndent}${initialStatement}`,
		...(bodyText ? [`${childIndent}${bodyText}`] : []),
		`${indent}})()`,
	].join('\n');

	return {
		messageId: SUGGESTION_ID,
		fix: fixer => fixer.replaceText(callExpression, replacement),
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		const {callee} = callExpression;
		if (callee.type !== 'MemberExpression') {
			return;
		}

		const method = getPropertyName(callee, context.sourceCode.getScope(callExpression));
		if (!promiseMethods.has(method)) {
			return;
		}

		if (isCallExpressionValueDiscardedWithVoid(callExpression)) {
			return;
		}

		const promiseObject = isPromiseObject(callee.object, context);
		if (promiseObject === false) {
			return;
		}

		const suggestion = getSuggestion(callExpression, context);
		return {
			node: callee.property,
			messageId: MESSAGE_ID,
			data: {method},
			...(suggestion && {suggest: [suggestion]}),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `await` over promise chaining.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
