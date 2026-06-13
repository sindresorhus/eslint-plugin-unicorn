import {findVariable} from '@eslint-community/eslint-utils';
import {isCallExpression, isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	getTypeSymbol,
	isGlobalIdentifier,
	isDefaultLibrarySymbol,
	isDefinitionBeforeReference,
	isTypeImportSpecifier,
	isParenthesized,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-url-href';
const messages = {
	[MESSAGE_ID]: 'Prefer `URL#href` over stringifying a `URL`.',
};

const url = 'url';
const nonUrl = 'non-url';
const unknown = 'unknown';

const typeDefinitionTypes = new Set([
	'ClassName',
	'ImportBinding',
	'Type',
]);

const unknownTypeNames = new Set([
	'any',
	'error',
	'unknown',
]);

const urlImportSources = new Set([
	'node:url',
	'url',
]);

const isTypeDefinition = definition =>
	typeDefinitionTypes.has(definition.type);

const resolveIdentifierName = (name, scope, referenceNode, context) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable?.defs.some(definition => isDefinitionBeforeReference(definition, referenceNode, context))) {
			return variable;
		}

		scope = scope.upper;
	}
};

const hasTypeDefinition = (name, scope) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable?.defs.some(definition => isTypeDefinition(definition))) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
};

const combineTypes = types => {
	if (types.every(type => type === url)) {
		return url;
	}

	if (!types.includes(unknown) && types.includes(nonUrl)) {
		return nonUrl;
	}

	return unknown;
};

const isUrlImportSource = source =>
	urlImportSources.has(source.value);

const isUrlImport = definition => {
	if (definition.type !== 'ImportBinding') {
		return false;
	}

	const {node, parent} = definition;
	return isUrlImportSource(parent.source)
		&& node.type === 'ImportSpecifier'
		&& node.imported.type === 'Identifier'
		&& node.imported.name === 'URL';
};

const isTypeOnlyImport = definition =>
	definition.type === 'ImportBinding'
	&& (
		definition.parent.importKind === 'type'
		|| isTypeImportSpecifier(definition.node)
	);

const isTypeOnlyDefinition = definition =>
	definition.type === 'Type'
	|| isTypeOnlyImport(definition);

const hasVisibleValueDefinition = (name, scope, referenceNode, context) => {
	while (scope) {
		const variable = scope.set.get(name);

		if (variable?.defs.some(definition =>
			!isTypeOnlyDefinition(definition)
			&& isDefinitionBeforeReference(definition, referenceNode, context),
		)) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
};

const isValueUrlImport = definition =>
	isUrlImport(definition)
	&& !isTypeOnlyImport(definition);

const isGlobalUrlConstructor = (node, context) => {
	if (
		node.type !== 'Identifier'
		|| node.name !== 'URL'
	) {
		return false;
	}

	if (hasVisibleValueDefinition('URL', context.sourceCode.getScope(node), node, context)) {
		return false;
	}

	if (isGlobalIdentifier(node, context)) {
		return true;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.length > 0
		&& variable.defs.every(definition => isTypeOnlyDefinition(definition));
};

const isImportedUrlConstructor = (node, context) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition => isValueUrlImport(definition)) ?? false;
};

const isUrlConstructor = (node, context) =>
	isGlobalUrlConstructor(node, context)
	|| isImportedUrlConstructor(node, context);

const isNewUrlExpression = (node, context) =>
	node.type === 'NewExpression'
	&& isUrlConstructor(node.callee, context);

const isKnownNonUrlConstructor = (node, context) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	return variable?.defs.some(definition =>
		!isTypeOnlyDefinition(definition)
		&& !isValueUrlImport(definition),
	) ?? false;
};

const getDefinitionScope = (definition, context) =>
	context.sourceCode.getScope(definition.name ?? definition.node);

const getTypeReferenceType = (node, context, scope, visitedTypeReferenceNames) => {
	if (node.typeName.type !== 'Identifier') {
		return unknown;
	}

	const typeReferenceName = node.typeName.name;
	const typeVariable = resolveIdentifierName(typeReferenceName, scope, node.typeName, context);
	const [definition] = typeVariable?.defs ?? [];

	if (!definition) {
		return typeReferenceName === 'URL' && !hasTypeDefinition(typeReferenceName, scope) ? url : unknown;
	}

	if (visitedTypeReferenceNames.has(typeReferenceName)) {
		return unknown;
	}

	if (isUrlImport(definition)) {
		return url;
	}

	visitedTypeReferenceNames.add(typeReferenceName);

	let type = unknown;

	if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeAliasDeclaration'
	) {
		type = getTypeAnnotationType(definition.node.typeAnnotation, context, getDefinitionScope(definition, context), visitedTypeReferenceNames);
	} else if (
		definition.type === 'Type'
		&& definition.node.type === 'TSTypeParameter'
	) {
		type = unknown;
	} else if (definition.type === 'ClassName') {
		type = nonUrl;
	}

	visitedTypeReferenceNames.delete(typeReferenceName);

	return type;
};

const getTypeAnnotationType = (node, context, scope, visitedTypeReferenceNames = new Set()) => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return getTypeAnnotationType(node.typeAnnotation, context, scope, visitedTypeReferenceNames);
		}

		case 'TSTypeReference': {
			return getTypeReferenceType(node, context, scope, visitedTypeReferenceNames);
		}

		case 'TSUnionType': {
			return combineTypes(node.types.map(type => getTypeAnnotationType(type, context, scope, visitedTypeReferenceNames)));
		}

		case 'TSIntersectionType': {
			return combineTypes(node.types.map(type => getTypeAnnotationType(type, context, scope, visitedTypeReferenceNames)));
		}

		case 'TSImportType': {
			return isUrlImportSource(node.source)
				&& node.qualifier?.type === 'Identifier'
				&& node.qualifier.name === 'URL'
				? url
				: nonUrl;
		}

		default: {
			return node ? nonUrl : unknown;
		}
	}
};

const getVisibleTypeNameType = (typeName, node, context) => {
	if (!/^[\w$]+$/.test(typeName)) {
		return unknown;
	}

	const variable = resolveIdentifierName(typeName, context.sourceCode.getScope(node), node, context);
	const typeDefinitions = variable?.defs.filter(definition =>
		definition.type === 'Type'
		|| definition.type === 'ClassName'
		|| isUrlImport(definition),
	) ?? [];

	if (typeDefinitions.length === 0) {
		return unknown;
	}

	return typeDefinitions.every(definition => isUrlImport(definition)) ? url : nonUrl;
};

const getTypeScriptUrlType = (type, state) => {
	const {
		checker,
		context,
		node,
		program,
	} = state;

	if (unknownTypeNames.has(type.intrinsicName)) {
		return unknown;
	}

	if (type.isTypeParameter?.()) {
		return unknown;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getTypeScriptUrlType(constraint, state);
	}

	if (type.isUnion()) {
		return combineTypes(type.types.map(type => getTypeScriptUrlType(type, state)));
	}

	if (type.isIntersection()) {
		return combineTypes(type.types.map(type => getTypeScriptUrlType(type, state)));
	}

	const typeName = checker.typeToString(type);
	const visibleTypeNameType = getVisibleTypeNameType(typeName, node, context);
	if (visibleTypeNameType !== unknown) {
		return visibleTypeNameType;
	}

	const symbol = getTypeSymbol(type);
	if (isDefaultLibrarySymbol(symbol, program) && symbol.getName() === 'URL') {
		return url;
	}

	return nonUrl;
};

const getTypeFromTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		const {program} = parserServices;
		return getTypeScriptUrlType(
			parserServices.getTypeAtLocation(node),
			{
				checker: program.getTypeChecker(),
				context,
				node,
				program,
			},
		);
	} catch {
		return unknown;
	}
};

const getTypeFromVariable = (node, context, visitedVariables) => {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (
		!variable
		|| visitedVariables.has(variable)
		|| variable.defs.length !== 1
	) {
		return unknown;
	}

	const [definition] = variable.defs;
	if (!isDefinitionBeforeReference(definition, node, context)) {
		return unknown;
	}

	visitedVariables.add(variable);

	const typeFromInitializer = definition.type === 'Variable'
		&& definition.parent.kind === 'const'
		&& definition.node.init
		? getUrlType(definition.node.init, context, visitedVariables)
		: unknown;
	const typeFromAnnotation = getTypeAnnotationType(definition.name?.typeAnnotation, context, getDefinitionScope(definition, context));
	let type = unknown;

	if (typeFromInitializer !== unknown) {
		type = typeFromInitializer;
	} else if (typeFromAnnotation !== unknown) {
		type = typeFromAnnotation;
	}

	visitedVariables.delete(variable);

	return type;
};

const getTypeFromFunctionReturn = (node, context) => {
	if (
		node.type !== 'CallExpression'
		|| node.callee.type !== 'Identifier'
	) {
		return unknown;
	}

	const variable = findVariable(context.sourceCode.getScope(node.callee), node.callee);
	if (variable?.defs.length !== 1) {
		return unknown;
	}

	const [definition] = variable.defs;
	return getTypeAnnotationType(definition.node.returnType, context, getDefinitionScope(definition, context));
};

function getUrlType(node, context, visitedVariables = new Set()) {
	if (!node) {
		return unknown;
	}

	const scope = context.sourceCode.getScope(node);

	switch (node.type) {
		case 'Identifier': {
			const typeFromVariable = getTypeFromVariable(node, context, visitedVariables);

			if (typeFromVariable !== unknown) {
				return typeFromVariable;
			}

			break;
		}

		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion': {
			const typeFromAnnotation = getTypeAnnotationType(node.typeAnnotation, context, scope);

			return typeFromAnnotation === unknown
				? getUrlType(node.expression, context, visitedVariables)
				: typeFromAnnotation;
		}

		case 'TSNonNullExpression':
		case 'ParenthesizedExpression': {
			return getUrlType(node.expression, context, visitedVariables);
		}

		case 'SequenceExpression': {
			return getUrlType(node.expressions.at(-1), context, visitedVariables);
		}

		case 'ConditionalExpression': {
			return combineTypes([
				getUrlType(node.consequent, context, visitedVariables),
				getUrlType(node.alternate, context, visitedVariables),
			]);
		}

		default: {
			break;
		}
	}

	if (isNewUrlExpression(node, context)) {
		return url;
	}

	if (node.type === 'NewExpression') {
		if (isKnownNonUrlConstructor(node.callee, context)) {
			return nonUrl;
		}

		const typeFromTypeInformation = getTypeFromTypeInformation(node, context);
		return typeFromTypeInformation === unknown ? nonUrl : typeFromTypeInformation;
	}

	const typeFromFunctionReturn = getTypeFromFunctionReturn(node, context);
	if (typeFromFunctionReturn !== unknown) {
		return typeFromFunctionReturn;
	}

	return getTypeFromTypeInformation(node, context);
}

const isUrlExpression = (node, context) =>
	getUrlType(node, context) === url;

const isFreshUrlExpression = (node, context) => {
	switch (node.type) {
		case 'TSAsExpression':
		case 'TSSatisfiesExpression':
		case 'TSTypeAssertion':
		case 'ParenthesizedExpression':
		case 'TSNonNullExpression': {
			return isFreshUrlExpression(node.expression, context);
		}

		case 'SequenceExpression': {
			return isFreshUrlExpression(node.expressions.at(-1), context);
		}

		case 'ConditionalExpression': {
			return isFreshUrlExpression(node.consequent, context)
				&& isFreshUrlExpression(node.alternate, context);
		}

		case 'NewExpression': {
			return isNewUrlExpression(node, context);
		}

		default: {
			return false;
		}
	}
};

const canFix = (node, context) => context.sourceCode.getCommentsInside(node).length === 0;

const getHrefText = (node, context) => {
	const nodeText = getParenthesizedText(node, context);
	const objectText = !isParenthesized(node, context) && shouldAddParenthesesToMemberExpressionObject(node, context) ? `(${nodeText})` : nodeText;
	const text = `${objectText}.href`;
	const semicolon = needsSemicolon(context.sourceCode.getTokenBefore(node.parent), context, text) ? ';' : '';
	return semicolon + text;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			isMethodCall(callExpression, {
				method: 'toString',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
			&& isUrlExpression(callExpression.callee.object, context)
		) {
			const problem = {
				node: callExpression.callee.property,
				messageId: MESSAGE_ID,
			};

			if (
				canFix(callExpression, context)
				&& !isParenthesized(callExpression.callee, context)
				&& isFreshUrlExpression(callExpression.callee.object, context)
			) {
				problem.fix = fixer => fixer.replaceTextRange(
					[
						context.sourceCode.getRange(callExpression.callee.property)[0],
						context.sourceCode.getRange(callExpression)[1],
					],
					'href',
				);
			}

			return problem;
		}

		if (!(
			isCallExpression(callExpression, {
				name: 'String',
				argumentsLength: 1,
				optional: false,
			})
			&& isGlobalIdentifier(callExpression.callee, context)
		)) {
			return;
		}

		const [argument] = callExpression.arguments;
		if (!isUrlExpression(argument, context)) {
			return;
		}

		const problem = {
			node: callExpression.callee,
			messageId: MESSAGE_ID,
		};

		if (
			canFix(callExpression, context)
			&& isFreshUrlExpression(argument, context)
		) {
			problem.fix = fixer => fixer.replaceText(callExpression, getHrefText(argument, context));
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `URL#href` over stringifying a `URL`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
