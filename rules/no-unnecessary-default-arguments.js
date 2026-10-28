import {createRequire} from 'node:module';
import {findVariable, getPropertyName, isCommaToken} from '@eslint-community/eslint-utils';
import {isDirectEvalCall} from './ast/index.js';
import {getArgumentRemovalRange, removeObjectProperty} from './fix/index.js';
import {
	containsNode,
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

/**
Check syntax for references to the function's type parameters.
*/
function referencesTypeParameter(node, typeParameters, context) {
	return Boolean(node) && typeParameters.size > 0 && containsNode(node, context, child => child.type === 'Identifier' && typeParameters.has(child.name));
}

/**
Check a property's uninstantiated type, including aliases and interfaces.
*/
function isResolvedPropertyTypeIndependent(node, name, typeParameters, {checker, typescript}) {
	const parameterType = checker.getTypeAtLocation(node);
	const mappedTypeFlag = typescript.ObjectFlags.Mapped;
	// These shapes can infer from the whole object even when this property's type is independent.
	if (
		parameterType.isTypeParameter()
		|| parameterType.isUnionOrIntersection()
		|| (parameterType.objectFlags % (mappedTypeFlag * 2)) >= mappedTypeFlag
		|| checker.getIndexInfosOfType(parameterType).length > 0
	) {
		return false;
	}

	const property = checker.getPropertyOfType(parameterType, name);
	if (!property) {
		return false;
	}

	const type = checker.getTypeOfSymbolAtLocation(property, node);
	const annotation = checker.typeToTypeNode(type, node, typescript.NodeBuilderFlags.NoTruncation);
	return Boolean(annotation) && !referencesTypeScriptTypeParameter(annotation, typeParameters, typescript);
}

/**
Check an inline property type, falling back to the checker for generic aliases.
*/
function isLocalPropertyTypeIndependent(pattern, name, typeParameters, context) {
	const annotation = pattern.typeAnnotation?.typeAnnotation;
	if (!annotation || typeParameters.size === 0) {
		return true;
	}

	if (annotation.type === 'TSTypeLiteral') {
		if (annotation.members.some(member => member.type === 'TSIndexSignature')) {
			return false;
		}

		const property = annotation.members.find(member => member.type === 'TSPropertySignature' && !member.computed && String(member.key.name ?? member.key.value) === name);
		return Boolean(property) && !referencesTypeParameter(property.typeAnnotation, typeParameters, context);
	}

	if (!referencesTypeParameter(annotation, typeParameters, context)) {
		return true;
	}

	const typescript = getTypeScript(context);
	return Boolean(typescript) && withTypeInformation(pattern, context, ({checker}) =>
		isResolvedPropertyTypeIndependent(context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(pattern), name, typeParameters, {checker, typescript})) === true;
}

function getLocalParameters(functionNode, context) {
	const scope = context.sourceCode.scopeManager.acquire(functionNode, true);
	if (
		scope?.set.get('arguments')?.references.length > 0
		// ESLint can leave `arguments` references in parameter initializers unresolved.
		|| scope?.through.some(reference => reference.identifier.name === 'arguments')
	) {
		return;
	}

	const typeParameters = new Set(functionNode.typeParameters?.params.map(parameter => parameter.name.name));
	return functionNode.params
		.filter(parameter => parameter.type !== 'Identifier' || parameter.name !== 'this')
		.map(parameter => {
			const pattern = parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
			if (pattern.type === 'Identifier') {
				const initializer = parameter.type === 'AssignmentPattern' ? parameter.right : undefined;
				const dependsOnTypeParameter = referencesTypeParameter(pattern.typeAnnotation, typeParameters, context)
					|| referencesTypeParameter(initializer, typeParameters, context);
				return {value: dependsOnTypeParameter ? undefined : getPrimitiveLiteralValue(initializer)};
			}

			const properties = pattern.type === 'ObjectPattern' && !referencesTypeParameter(parameter.right, typeParameters, context) ? getProperties(pattern) : undefined;
			const defaults = new Map();
			for (const [name, property] of properties ?? []) {
				const {value} = property;
				if (
					value.type === 'AssignmentPattern'
					&& value.left.type === 'Identifier'
					&& !Object.hasOwn(Object.prototype, name)
					&& !referencesTypeParameter(value.right, typeParameters, context)
					&& isLocalPropertyTypeIndependent(pattern, name, typeParameters, context)
				) {
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

/**
Check TypeScript syntax for references to the function's type parameters.
*/
function referencesTypeScriptTypeParameter(node, typeParameters, typescript) {
	if (!node || typeParameters.size === 0) {
		return false;
	}

	if (typescript.isIdentifier(node) && typeParameters.has(node.text)) {
		return true;
	}

	return typescript.forEachChild(node, child => referencesTypeScriptTypeParameter(child, typeParameters, typescript) ? true : undefined) === true;
}

function getTypeScriptPropertyDefaults(parameter, typeParameters, checker, typescript) {
	const pattern = parameter.name;
	if (!typescript.isObjectBindingPattern(pattern) || referencesTypeScriptTypeParameter(parameter.initializer, typeParameters, typescript)) {
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

		const value = typescript.isIdentifier(element.name)
			&& !Object.hasOwn(Object.prototype, name)
			&& !referencesTypeScriptTypeParameter(element.initializer, typeParameters, typescript)
			&& (
				!referencesTypeScriptTypeParameter(parameter.type, typeParameters, typescript)
				|| isResolvedPropertyTypeIndependent(parameter, name, typeParameters, {checker, typescript})
			)
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
		let expression;
		if (typescript.isFunctionDeclaration(declaration)) {
			functionNode = declaration;
		} else if (typescript.isVariableDeclaration(declaration) && declaration.parent.getFirstToken().kind === typescript.SyntaxKind.ConstKeyword) {
			expression = declaration.initializer;
		} else if (typescript.isExportAssignment(declaration) && !declaration.isExportEquals) {
			expression = declaration.expression;
		}

		const initializer = unwrapTypeScriptNode(expression, typescript);
		if (initializer && (typescript.isArrowFunction(initializer) || typescript.isFunctionExpression(initializer))) {
			functionNode = initializer;
		}

		if (!functionNode?.body || hasArgumentsOrEval(functionNode, typescript)) {
			return;
		}

		const typeParameters = new Set(functionNode.typeParameters?.map(parameter => parameter.name.text));
		const parameters = functionNode.parameters
			.filter(parameter => !typescript.isIdentifier(parameter.name) || parameter.name.text !== 'this')
			.map(parameter => ({
				value: typescript.isIdentifier(parameter.name)
					&& !referencesTypeScriptTypeParameter(parameter.type, typeParameters, typescript)
					&& !referencesTypeScriptTypeParameter(parameter.initializer, typeParameters, typescript)
					? getTypeScriptPrimitiveValue(parameter.initializer, typescript)
					: undefined,
				properties: getTypeScriptPropertyDefaults(parameter, typeParameters, checker, typescript),
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
	// Script function declarations can be reassigned through the global object without identifier writes.
	if (definition.type === 'FunctionName' && variable.scope.type === 'global') {
		return;
	}

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
		if (
			callee.type === 'Identifier'
			&& (
				getPrimitiveLiteralValue(node.arguments.at(-1)) !== undefined
				|| node.arguments.some(argument => unwrapTypeScriptExpression(argument).type === 'ObjectExpression')
			)
		) {
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

			const spreadIndex = call.arguments.findIndex(argument => argument.type === 'SpreadElement');
			const trailingProblem = spreadIndex === -1 ? getTrailingArgumentsProblem(call, parameters, context) : undefined;
			if (trailingProblem) {
				yield getProblem(trailingProblem, 'remove-arguments');
			}

			const argumentsBeforeSpread = spreadIndex === -1 ? call.arguments : call.arguments.slice(0, spreadIndex);
			for (const [index, argument] of argumentsBeforeSpread.entries()) {
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
