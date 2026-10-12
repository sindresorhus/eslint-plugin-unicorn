import {createRequire} from 'node:module';
import {findVariable, getPropertyName, isCommaToken} from '@eslint-community/eslint-utils';
import {isDirectEvalCall} from './ast/index.js';
import {getArgumentRemovalRange, removeObjectProperty} from './fix/index.js';
import {
	getCommentSafeProblem,
	getFunctionFromIdentifier,
	getParenthesizedRange,
	getPrimitiveLiteralValue,
	hasJavaScriptTypeAnnotations,
	isAliasSymbol,
	isTypeScriptFile,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const messages = {
	arguments: 'Omit trailing arguments that match their parameter defaults.',
	property: 'Property `{{name}}` matches its destructuring default.',
	'remove-arguments': 'Remove these arguments (requires type review).',
	'remove-property': 'Remove this property (requires type review).',
};

const loadModule = createRequire(import.meta.url);

function getTypeScript(context) {
	if (!context.sourceCode.parserServices.program) {
		return;
	}

	try {
		return loadModule('typescript');
	} catch {
		// TypeScript is an optional peer; local checks work without it.
	}
}

function getProperties(node) {
	const properties = new Map();
	for (const property of node.properties) {
		if (node.type === 'ObjectPattern' && property.type === 'RestElement') {
			continue;
		}

		if (property.type !== 'Property' || property.computed || property.method || property.kind !== 'init') {
			return;
		}

		const name = getPropertyName(property);
		if (name === undefined || name === '__proto__' || properties.has(name)) {
			return;
		}

		properties.set(name, property);
	}

	return properties;
}

function getLocalParameters(functionNode, context) {
	const scope = context.sourceCode.scopeManager.acquire(functionNode, true);
	if (
		functionNode.typeParameters?.params.length > 0
		|| scope?.set.get('arguments')?.references.length > 0
		// ESLint can leave `arguments` references in parameter initializers unresolved.
		|| scope?.through.some(reference => reference.identifier.name === 'arguments')
	) {
		return;
	}

	return functionNode.params
		.filter(parameter => parameter.type !== 'Identifier' || parameter.name !== 'this')
		.map(parameter => {
			const pattern = parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
			if (pattern.type === 'Identifier') {
				return {value: getPrimitiveLiteralValue(parameter.type === 'AssignmentPattern' ? parameter.right : undefined)};
			}

			const properties = pattern.type === 'ObjectPattern' ? getProperties(pattern) : undefined;
			const defaults = new Map();
			for (const [name, property] of properties ?? []) {
				const {value} = property;
				if (value.type === 'AssignmentPattern' && value.left.type === 'Identifier' && !Object.hasOwn(Object.prototype, name)) {
					defaults.set(name, getPrimitiveLiteralValue(value.right));
				}
			}

			return {properties: defaults};
		});
}

function unwrapTypeScriptNode(node, typescript) {
	while (node && (
		typescript.isParenthesizedExpression(node)
		|| typescript.isAsExpression(node)
		|| typescript.isTypeAssertionExpression(node)
		|| typescript.isSatisfiesExpression(node)
		|| typescript.isNonNullExpression(node)
		|| typescript.isExpressionWithTypeArguments(node)
	)) {
		node = node.expression;
	}

	return node;
}

function getTypeScriptPrimitiveValue(node, typescript) {
	node = unwrapTypeScriptNode(node, typescript);
	if (!node) {
		return;
	}

	if (typescript.isStringLiteral(node) || typescript.isNoSubstitutionTemplateLiteral(node)) {
		return node.text;
	}

	if (typescript.isNumericLiteral(node)) {
		return Number(node.text);
	}

	if (typescript.isBigIntLiteral(node)) {
		return BigInt(node.text.slice(0, -1));
	}

	switch (node.kind) {
		case typescript.SyntaxKind.TrueKeyword: {
			return true;
		}

		case typescript.SyntaxKind.FalseKeyword: {
			return false;
		}

		case typescript.SyntaxKind.NullKeyword: {
			return null;
		}

		default: {
			break;
		}
	}

	if (!typescript.isPrefixUnaryExpression(node)) {
		return;
	}

	const operand = unwrapTypeScriptNode(node.operand, typescript);
	if (typescript.isNumericLiteral(operand)) {
		if (node.operator === typescript.SyntaxKind.MinusToken) {
			return -Number(operand.text);
		}

		if (node.operator === typescript.SyntaxKind.PlusToken) {
			return Number(operand.text);
		}
	}

	if (node.operator === typescript.SyntaxKind.MinusToken && typescript.isBigIntLiteral(operand)) {
		return -BigInt(operand.text.slice(0, -1));
	}
}

function hasArgumentsOrEval(node, typescript) {
	if (typescript.isIdentifier(node) && (node.text === 'arguments' || node.text === 'eval')) {
		return true;
	}

	return typescript.forEachChild(node, child => hasArgumentsOrEval(child, typescript) ? true : undefined) === true;
}

function getTypeScriptPropertyDefaults(pattern, typescript) {
	if (!typescript.isObjectBindingPattern(pattern)) {
		return;
	}

	const defaults = new Map();
	for (const element of pattern.elements) {
		if (element.dotDotDotToken) {
			continue;
		}

		const key = element.propertyName ?? element.name;
		if (!typescript.isIdentifier(key) && !typescript.isStringLiteral(key) && !typescript.isNumericLiteral(key)) {
			return;
		}

		const name = key.text;
		if (name === '__proto__' || defaults.has(name)) {
			return;
		}

		const value = typescript.isIdentifier(element.name) && !Object.hasOwn(Object.prototype, name)
			? getTypeScriptPrimitiveValue(element.initializer, typescript)
			: undefined;
		defaults.set(name, value);
	}

	return defaults;
}

function getImportedParameters(callee, context, typescript, cache) {
	return withTypeInformation(callee, context, ({checker}) => {
		const typeScriptNode = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(callee);
		let symbol = checker.getSymbolAtLocation(typeScriptNode);
		if (symbol && isAliasSymbol(symbol)) {
			symbol = checker.getAliasedSymbol(symbol);
		}

		if (symbol?.declarations?.length !== 1) {
			return;
		}

		const [declaration] = symbol.declarations;
		if (cache.has(declaration)) {
			return cache.get(declaration);
		}

		cache.set(declaration, undefined);
		let functionNode;
		if (typescript.isFunctionDeclaration(declaration)) {
			functionNode = declaration;
		} else if (typescript.isVariableDeclaration(declaration) && declaration.parent.getFirstToken().kind === typescript.SyntaxKind.ConstKeyword) {
			const initializer = unwrapTypeScriptNode(declaration.initializer, typescript);
			if (initializer && (typescript.isArrowFunction(initializer) || typescript.isFunctionExpression(initializer))) {
				functionNode = initializer;
			}
		}

		if (!functionNode?.body || functionNode.typeParameters?.length > 0 || hasArgumentsOrEval(functionNode, typescript)) {
			return;
		}

		const parameters = functionNode.parameters
			.filter(parameter => !typescript.isIdentifier(parameter.name) || parameter.name.text !== 'this')
			.map(parameter => ({
				value: typescript.isIdentifier(parameter.name) ? getTypeScriptPrimitiveValue(parameter.initializer, typescript) : undefined,
				properties: getTypeScriptPropertyDefaults(parameter.name, typescript),
			}));
		cache.set(declaration, parameters);
		return parameters;
	});
}

function getParameters(callee, context, typescript, cache) {
	const variable = findVariable(context.sourceCode.getScope(callee), callee);
	if (variable?.defs.length !== 1 || variable.references.some(reference => !reference.init && reference.isWrite())) {
		return;
	}

	const [definition] = variable.defs;
	if (definition.type === 'ImportBinding') {
		return typescript ? getImportedParameters(callee, context, typescript, cache) : undefined;
	}

	if (definition.type === 'Variable' && definition.parent.kind !== 'const') {
		return;
	}

	const functionNode = getFunctionFromIdentifier(callee, context);
	if (!functionNode?.body) {
		return;
	}

	if (!cache.has(functionNode)) {
		cache.set(functionNode, getLocalParameters(functionNode, context));
	}

	return cache.get(functionNode);
}

function getTrailingArgumentsProblem(call, parameters, context) {
	let firstIndex = call.arguments.length;
	while (firstIndex > 0) {
		const index = firstIndex - 1;
		const value = parameters[index]?.value;
		if (value === undefined || !Object.is(value, getPrimitiveLiteralValue(call.arguments[index]))) {
			break;
		}

		firstIndex--;
	}

	if (firstIndex === call.arguments.length) {
		return;
	}

	const first = call.arguments[firstIndex];
	const last = call.arguments.at(-1);
	const [start] = getArgumentRemovalRange(first, context);
	let [, end] = getParenthesizedRange(last, context);
	const token = context.sourceCode.getLastToken(call, {skip: 1});
	if (isCommaToken(token)) {
		[, end] = context.sourceCode.getRange(token);
	}

	return getCommentSafeProblem(context, {
		node: first,
		messageId: 'arguments',
		fix: fixer => fixer.removeRange([start, end]),
	}, [start, end]);
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const typescript = getTypeScript(context);
	const cache = new WeakMap();
	const calls = [];
	let hasDynamicScope = false;
	const needsTypeReview = isTypeScriptFile(context.filename)
		|| Boolean(sourceCode.parserServices.esTreeNodeToTSNodeMap)
		|| hasJavaScriptTypeAnnotations(context);

	const getProblem = (problem, suggestionId) => {
		if (!needsTypeReview || !problem.fix) {
			return problem;
		}

		const {fix, ...problemWithoutFix} = problem;
		return {...problemWithoutFix, suggest: [{messageId: suggestionId, fix}]};
	};

	context.on('WithStatement', () => {
		hasDynamicScope = true;
	});
	context.on('FunctionDeclaration', node => {
		const scope = sourceCode.getScope(node.parent);
		if (!scope.isStrict && scope !== scope.variableScope) {
			hasDynamicScope = true;
		}
	});
	context.on('CallExpression', node => {
		if (isDirectEvalCall(node)) {
			hasDynamicScope = true;
		}

		const callee = unwrapTypeScriptExpression(node.callee);
		if (callee.type === 'Identifier' && node.arguments.length > 0 && node.arguments.every(argument => argument.type !== 'SpreadElement')) {
			calls.push(node);
		}
	});

	context.onExit('Program', function * () {
		if (hasDynamicScope) {
			return;
		}

		for (const call of calls) {
			const parameters = getParameters(unwrapTypeScriptExpression(call.callee), context, typescript, cache);
			if (!parameters) {
				continue;
			}

			const trailingProblem = getTrailingArgumentsProblem(call, parameters, context);
			if (trailingProblem) {
				yield getProblem(trailingProblem, 'remove-arguments');
			}

			for (const [index, argument] of call.arguments.entries()) {
				const defaults = parameters[index]?.properties;
				const object = unwrapTypeScriptExpression(argument);
				if (!defaults || object.type !== 'ObjectExpression') {
					continue;
				}

				for (const [name, property] of getProperties(object) ?? []) {
					const value = defaults.get(name);
					if (value === undefined || !Object.is(value, getPrimitiveLiteralValue(property.value))) {
						continue;
					}

					yield getProblem(getCommentSafeProblem(context, {
						node: property,
						messageId: 'property',
						data: {name},
						fix: fixer => removeObjectProperty(fixer, property, context),
					}), 'remove-property');
				}
			}
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow arguments that match their parameter defaults.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
