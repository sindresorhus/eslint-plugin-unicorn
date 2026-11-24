import {createRequire} from 'node:module';
import {getPropertyName, isCommaToken} from '@eslint-community/eslint-utils';
import {isDirectEvalCall} from './ast/index.js';
import {getArgumentRemovalRange, removeObjectProperty} from './fix/index.js';
import {getNumericCharacterReferenceCodePoint, jsxNumericCharacterReferencePattern} from './shared/numeric-character-references.js';
import {
	containsNode,
	getCommentSafeProblem,
	getFunctionFromDefinition,
	getIdentifierReference,
	getOutermostTypeScriptExpression,
	getParenthesizedRange,
	getPrimitiveLiteralValue,
	hasJavaScriptTypeAnnotations,
	isAliasSymbol,
	isLeftHandSide,
	isOptionalSymbol,
	isTypeOnlyDefinition,
	isTypeScriptFile,
	linebreakPattern,
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
	'jsx-prop': 'Prop `{{name}}` matches the component’s destructuring default.',
	'remove-arguments': 'Remove these arguments (requires type review).',
	'remove-property': 'Remove this property (requires type review).',
	'remove-jsx-prop': 'Remove this prop (requires runtime review).',
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

function getJsxAttributes(element) {
	const attributes = new Map();
	for (const attribute of element.attributes) {
		if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') {
			return;
		}

		const {name} = attribute.name;
		// Vue JSX directives can generate or override props.
		if (name === '__proto__' || attributes.has(name) || /^v[-A-Z]/u.test(name)) {
			return;
		}

		attributes.set(name, attribute);
	}

	return attributes;
}

function getJsxAttributeValue({value}, sourceCode) {
	if (!value) {
		return true;
	}

	if (value.type === 'JSXExpressionContainer') {
		return getPrimitiveLiteralValue(value.expression);
	}

	if (value.type !== 'Literal' || linebreakPattern.test(value.value)) {
		return;
	}

	const raw = sourceCode.getText(value);
	// Limit numeric references to BMP scalar values that Espree can read without truncation.
	const rawWithoutSupportedNumericReferences = raw.replaceAll(
		jsxNumericCharacterReferencePattern,
		reference => {
			const codePoint = getNumericCharacterReferenceCodePoint(reference);
			return codePoint <= 0xFF_FF && String.fromCodePoint(codePoint).isWellFormed() ? ' ' : reference;
		},
	);
	if (
		rawWithoutSupportedNumericReferences.includes('&#')
		// Some parsers look up inherited names such as `toString` as if they were entities.
		|| raw.matchAll(/&(\w+);/gv).some(([, name]) => Object.hasOwn(Object.prototype, name))
	) {
		return;
	}

	return value.value;
}

/**
Check whether syntax may depend on the function's type parameters, treating type queries conservatively.
*/
function isTypeDependent(node, typeParameters, context) {
	return Boolean(node) && typeParameters.size > 0 && containsNode(node, context, child =>
		child.type === 'TSTypeQuery'
		|| (child.type === 'Identifier' && typeParameters.has(child.name)));
}

/**
Check a property's uninstantiated type, including aliases and interfaces.
*/
function isResolvedPropertyTypeIndependent(node, name, typeParameters, {checker, typescript}) {
	const parameterType = checker.getTypeAtLocation(node);
	const mappedTypeFlag = typescript.ObjectFlags.Mapped;
	// Only concrete objects with explicit properties can establish independence.
	if (
		parameterType.flags !== typescript.TypeFlags.Object
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
	return Boolean(annotation) && !isTypeScriptTypeDependent(annotation, typeParameters, typescript);
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
		return Boolean(property) && !isTypeDependent(property.typeAnnotation, typeParameters, context);
	}

	if (!isTypeDependent(annotation, typeParameters, context)) {
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
				const dependsOnTypeParameter = isTypeDependent(pattern.typeAnnotation, typeParameters, context)
					|| isTypeDependent(initializer, typeParameters, context);
				return {value: dependsOnTypeParameter ? undefined : getPrimitiveLiteralValue(initializer)};
			}

			const properties = pattern.type === 'ObjectPattern' && (typeParameters.size === 0 || parameter.type !== 'AssignmentPattern') ? getProperties(pattern) : undefined;
			const defaults = new Map();
			for (const [name, property] of properties ?? []) {
				const {value} = property;
				if (
					value.type === 'AssignmentPattern'
					&& value.left.type === 'Identifier'
					&& !Object.hasOwn(Object.prototype, name)
					&& !isTypeDependent(value.right, typeParameters, context)
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
Check whether TypeScript syntax may depend on the function's type parameters, treating type queries conservatively.
*/
function isTypeScriptTypeDependent(node, typeParameters, typescript) {
	if (!node || typeParameters.size === 0) {
		return false;
	}

	if (typescript.isTypeQueryNode(node) || (typescript.isIdentifier(node) && typeParameters.has(node.text))) {
		return true;
	}

	return typescript.forEachChild(node, child => isTypeScriptTypeDependent(child, typeParameters, typescript) ? true : undefined) === true;
}

function getTypeScriptPropertyDefaults(parameter, typeParameters, checker, typescript) {
	const pattern = parameter.name;
	if (!typescript.isObjectBindingPattern(pattern) || (typeParameters.size > 0 && parameter.initializer)) {
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
			&& !isTypeScriptTypeDependent(element.initializer, typeParameters, typescript)
			&& (
				!isTypeScriptTypeDependent(parameter.type, typeParameters, typescript)
				|| isResolvedPropertyTypeIndependent(parameter, name, typeParameters, {checker, typescript})
			)
			? getTypeScriptPrimitiveValue(element.initializer, typescript)
			: undefined;
		defaults.set(name, value);
	}

	return defaults;
}

/**
Get an imported declaration's supported function implementation.
*/
function getImportedFunction(declaration, typescript) {
	let functionNode;
	let expression;
	if (typescript.isFunctionDeclaration(declaration)) {
		functionNode = declaration;
	} else if (typescript.isVariableDeclaration(declaration) && declaration.parent.getFirstToken().kind === typescript.SyntaxKind.ConstKeyword) {
		expression = declaration.initializer;
	} else if (typescript.isExportAssignment(declaration) && !declaration.isExportEquals) {
		expression = declaration.expression;
	}

	while (expression && typescript.isParenthesizedExpression(expression)) {
		expression = expression.expression;
	}

	const initializer = unwrapTypeScriptNode(expression, typescript);
	if (initializer && (typescript.isArrowFunction(initializer) || typescript.isFunctionExpression(initializer))) {
		functionNode = initializer;
	}

	if (
		!functionNode?.body
		|| (functionNode.typeParameters?.length > 0 && expression && (declaration.type || expression !== functionNode))
		|| hasArgumentsOrEval(functionNode, typescript)
	) {
		return;
	}

	return functionNode;
}

function getImportedParameters(callee, context, typescript, cache) {
	return withTypeInformation(callee, context, ({checker}) => {
		const typeScriptNode = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(callee);
		let symbol = checker.getSymbolAtLocation(typeScriptNode);
		if (symbol && isAliasSymbol(symbol)) {
			symbol = checker.getAliasedSymbol(symbol);
		}

		const declarations = symbol?.declarations?.filter(declaration => !typescript.isTypeAliasDeclaration(declaration) && !typescript.isInterfaceDeclaration(declaration));
		if (declarations?.length !== 1) {
			return;
		}

		const [declaration] = declarations;
		if (cache.has(declaration)) {
			return cache.get(declaration);
		}

		cache.set(declaration, undefined);
		const functionNode = getImportedFunction(declaration, typescript);
		if (!functionNode) {
			return;
		}

		const typeParameters = new Set(functionNode.typeParameters?.map(parameter => parameter.name.text));
		const parameters = functionNode.parameters
			.filter(parameter => !typescript.isIdentifier(parameter.name) || parameter.name.text !== 'this')
			.map(parameter => ({
				value: typescript.isIdentifier(parameter.name)
					&& !isTypeScriptTypeDependent(parameter.type, typeParameters, typescript)
					&& !isTypeScriptTypeDependent(parameter.initializer, typeParameters, typescript)
					? getTypeScriptPrimitiveValue(parameter.initializer, typescript)
					: undefined,
				properties: getTypeScriptPropertyDefaults(parameter, typeParameters, checker, typescript),
			}));
		cache.set(declaration, parameters);
		return parameters;
	});
}

function getParameters(callee, context, typescript, cache) {
	// Parameter initializers can resolve outside the function body's scope.
	const variable = getIdentifierReference(callee, context.sourceCode.getScope(callee))?.resolved;
	if (!variable || variable.references.some(reference => !reference.init && reference.isWrite())) {
		return;
	}

	const definitions = variable.defs.filter(definition => !isTypeOnlyDefinition(definition));
	if (definitions.length !== 1) {
		return;
	}

	// JSX runtimes can use static properties to change which props reach the component.
	if (callee.type === 'JSXIdentifier' && variable.references.some(({identifier}) => {
		const receiver = getOutermostTypeScriptExpression(identifier);
		const member = receiver.parent;
		return member?.type === 'MemberExpression' && member.object === receiver && isLeftHandSide(member);
	})) {
		return;
	}

	const [definition] = definitions;
	// Script function declarations can be reassigned through the global object without identifier writes.
	if (definition.type === 'FunctionName' && variable.scope.type === 'global') {
		return;
	}

	if (definition.type === 'ImportBinding') {
		return typescript ? getImportedParameters(callee, context, typescript, cache) : undefined;
	}

	const functionNode = getFunctionFromDefinition(definition);
	if (!functionNode?.body) {
		return;
	}

	if (definition.type === 'Variable') {
		if (definition.parent.kind !== 'const') {
			return;
		}

		if (functionNode.typeParameters?.params.length > 0 && (definition.name.typeAnnotation || definition.node.init !== functionNode)) {
			return;
		}
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

function hasSingleCallSignature(type, typeArgumentCount = 0) {
	const signatures = type.getCallSignatures();
	return signatures.length === 1 && (signatures[0].typeParameters?.length ?? 0) === typeArgumentCount;
}

function getJsxTypeInformation(element, context, typescript) {
	return withTypeInformation(element.name, context, ({type, checker}) => {
		if (type.getProperties().length > 0) {
			return {hasStaticProperties: true};
		}

		const typeScriptElement = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(element);
		const typeArgumentCount = typeScriptElement.typeArguments?.length ?? 0;
		// TypeScript prefers construct signatures for JSX. A complete type argument list avoids prop inference.
		if (!hasSingleCallSignature(type, typeArgumentCount) || type.getConstructSignatures().length > 0) {
			return;
		}

		const attributeType = checker.getContextualType(typeScriptElement.attributes);
		if (!attributeType) {
			return;
		}

		// JSX often intersects the declared props with the runtime's intrinsic attributes.
		const attributeTypes = attributeType.isIntersection() ? attributeType.types : [attributeType];
		if (attributeTypes.every(type => type.flags === typescript.TypeFlags.Object)) {
			return {attributeType};
		}
	});
}

/**
Check whether removing the reported arguments or property preserves the call's types.
*/
function isTypeSafeToRemove(call, node, context, typescript) {
	if (!typescript) {
		return false;
	}

	return withTypeInformation(call, context, ({checker}) => {
		const {esTreeNodeToTSNodeMap} = context.sourceCode.parserServices;
		const typeScriptCall = esTreeNodeToTSNodeMap.get(call);
		const type = checker.getTypeAtLocation(typeScriptCall.expression);
		if (!hasSingleCallSignature(checker.getNonNullableType(type))) {
			return false;
		}

		if (node.type !== 'Property') {
			const signature = checker.getResolvedSignature(typeScriptCall);
			const firstIndex = call.arguments.indexOf(node);
			return call.arguments.slice(firstIndex).every((argument, offset) => {
				const parameter = signature?.parameters[firstIndex + offset]?.valueDeclaration;
				return Boolean(parameter && typescript.isParameter(parameter) && checker.isOptionalParameter(parameter));
			});
		}

		const object = esTreeNodeToTSNodeMap.get(node.parent);
		if (object.parent !== typeScriptCall) {
			return false;
		}

		const contextualType = checker.getContextualType(object);
		if (!contextualType) {
			return false;
		}

		const objectType = checker.getNonNullableType(contextualType);
		if (objectType.flags !== typescript.TypeFlags.Object) {
			return false;
		}

		const property = objectType.getProperty(getPropertyName(node));
		return Boolean(property && isOptionalSymbol(property));
	}) ?? false;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const typescript = getTypeScript(context);
	const cache = new WeakMap();
	const calls = [];
	const jsxElements = [];
	let hasDynamicScope = false;
	const needsTypeReview = isTypeScriptFile(context.filename)
		|| Boolean(sourceCode.parserServices.esTreeNodeToTSNodeMap)
		|| hasJavaScriptTypeAnnotations(context);

	const getProblem = (call, problem, suggestionId) => {
		if (!needsTypeReview || !problem.fix || isTypeSafeToRemove(call, problem.node, context, typescript)) {
			return problem;
		}

		const {fix, ...problemWithoutFix} = problem;
		return {...problemWithoutFix, suggest: [{messageId: suggestionId, fix}]};
	};

	const getJsxProblems = function * (element) {
		const attributes = getJsxAttributes(element);
		const defaults = attributes && getParameters(element.name, context, typescript, cache)?.[0]?.properties;
		if (!defaults?.size) {
			return;
		}

		const typeInformation = typescript && getJsxTypeInformation(element, context, typescript);
		if (typeInformation?.hasStaticProperties) {
			return;
		}

		for (const [name, attribute] of attributes) {
			const defaultValue = defaults.get(name);
			if (
				['key', 'ref', '__self', '__source'].includes(name)
				|| (name === 'children' && element.parent.children.length > 0)
				|| defaultValue === undefined
				|| !Object.is(defaultValue, getJsxAttributeValue(attribute, sourceCode))
			) {
				continue;
			}

			const problem = {node: attribute, messageId: 'jsx-prop', data: {name}};
			const property = typeInformation?.attributeType?.getProperty(name);
			if (!needsTypeReview || (property && isOptionalSymbol(property))) {
				problem.suggest = [{messageId: 'remove-jsx-prop', fix: fixer => fixer.remove(attribute)}];
			}

			yield getCommentSafeProblem(context, problem);
		}
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
			&& !containsNode(node.callee, context, child => child.type === 'TSAsExpression' || child.type === 'TSTypeAssertion')
			&& (
				getPrimitiveLiteralValue(node.arguments.at(-1)) !== undefined
				|| node.arguments.some(argument => unwrapTypeScriptExpression(argument).type === 'ObjectExpression')
			)
		) {
			calls.push(node);
		}
	});
	context.on('JSXOpeningElement', node => {
		if (node.attributes.length > 0 && node.name.type === 'JSXIdentifier' && !/^[a-z]|-/u.test(node.name.name)) {
			jsxElements.push(node);
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
				yield getProblem(call, trailingProblem, 'remove-arguments');
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

					yield getProblem(call, getCommentSafeProblem(context, {
						node: property,
						messageId: 'property',
						data: {name},
						fix: fixer => removeObjectProperty(fixer, property, context),
					}), 'remove-property');
				}
			}
		}

		for (const element of jsxElements) {
			yield * getJsxProblems(element);
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
			description: 'Disallow arguments and JSX props that match their defaults.',
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
