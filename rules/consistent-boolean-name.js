import {getPropertyName} from '@eslint-community/eslint-utils';
import {renameVariable} from './fix/index.js';
import {
	getAvailableVariableName,
	getScopes,
	getVariableIdentifiers,
	upperFirst,
} from './utils/index.js';
import {
	isBooleanExpression,
	isBooleanFunction,
	isBooleanFunctionReference,
	isBooleanFunctionTypeAnnotation,
	isBooleanTypeAnnotation,
} from './utils/is-boolean.js';

const MESSAGE_ID = 'consistent-boolean-name';
const MESSAGE_ID_SUGGESTION = 'rename';
const messages = {
	[MESSAGE_ID]: 'Boolean name `{{name}}` should start with {{prefixes}}.',
	[MESSAGE_ID_SUGGESTION]: 'Rename to `{{replacement}}`.',
};

const defaultPrefixes = {
	is: true,
	has: true,
	can: true,
	should: true,
	was: true,
	did: true,
	will: true,
};

const getEnabledPrefixes = ({prefixes = {}} = {}) =>
	Object.entries({
		...defaultPrefixes,
		...prefixes,
	})
		.filter(([, enabled]) => enabled)
		.map(([prefix]) => prefix);

const formatPrefixes = prefixes =>
	prefixes.map(prefix => `\`${prefix}\``).join(', ');

const isUpperCase = string => string === string.toUpperCase();
const stripLeadingUnderscores = name => name.replace(/^_+/, '');

const isFunction = node => [
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
	'TSDeclareFunction',
].includes(node?.type);

const propertyDefinitionTypes = new Set([
	'PropertyDefinition',
	'AccessorProperty',
	'TSAbstractPropertyDefinition',
	'TSAbstractAccessorProperty',
]);

const unwrapParameter = node => node.type === 'TSParameterProperty'
	? node.parameter
	: node;

const isSameNode = (a, b) =>
	a?.range[0] === b?.range[0]
	&& a?.range[1] === b?.range[1];

function findParameter(parameters, identifier) {
	for (const parameter of parameters) {
		const unwrappedParameter = unwrapParameter(parameter);
		const parameterName = unwrappedParameter.type === 'AssignmentPattern'
			? unwrappedParameter.left
			: unwrappedParameter;

		if (isSameNode(parameterName, identifier)) {
			return unwrappedParameter;
		}
	}
}

const prepareOptions = ({
	checkProperties = false,
	prefixes = {},
} = {}) => ({
	checkProperties,
	prefixes: getEnabledPrefixes({prefixes}),
});

function hasBooleanPrefix(name, prefixes) {
	name = stripLeadingUnderscores(name);

	for (const prefix of prefixes) {
		if (name.startsWith(`${prefix.toUpperCase()}_`)) {
			return true;
		}

		if (
			name.startsWith(prefix)
			&& name.length > prefix.length
			&& /[\dA-Z_]/.test(name[prefix.length])
		) {
			return true;
		}
	}

	return false;
}

function getReplacementName(name, prefix) {
	const leadingUnderscores = name.match(/^_*/)[0];
	const nameWithoutLeadingUnderscores = stripLeadingUnderscores(name);

	return isUpperCase(nameWithoutLeadingUnderscores)
		? `${leadingUnderscores}${prefix.toUpperCase()}_${nameWithoutLeadingUnderscores}`
		: `${leadingUnderscores}${prefix}${upperFirst(nameWithoutLeadingUnderscores)}`;
}

const isExportedIdentifier = identifier => {
	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
	) {
		return (
			identifier.parent.parent.type === 'VariableDeclaration'
			&& identifier.parent.parent.parent.type === 'ExportNamedDeclaration'
		);
	}

	if (
		identifier.parent.type === 'ExportSpecifier'
		&& identifier.parent.local === identifier
		&& identifier.parent.local === identifier.parent.exported
	) {
		return true;
	}

	if (
		identifier.parent.type === 'FunctionDeclaration'
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

const isExportSpecifierLocal = identifier =>
	identifier.parent.type === 'ExportSpecifier'
	&& identifier.parent.local === identifier;

const isExportDefaultIdentifier = identifier =>
	identifier.parent.type === 'ExportDefaultDeclaration'
	&& identifier.parent.declaration === identifier;

const shouldSuggestRename = variable => getVariableIdentifiers(variable)
	.every(identifier =>
		!isExportedIdentifier(identifier)
		&& identifier.type !== 'JSXIdentifier',
	);

const isBooleanFunctionDefinition = (definition, context) =>
	definition.type === 'FunctionName'
	&& isFunction(definition.node)
	&& isBooleanFunction(definition.node, context);

const isBooleanValue = (node, context) => isFunction(node)
	? isBooleanFunction(node, context)
	: isBooleanFunctionReference(node, context) || isBooleanExpression(node, context);

const isBooleanVariable = (variable, context) => {
	const {sourceCode} = context;

	if (
		variable.defs.length > 1
		&& variable.defs.every(definition => definition.type === 'FunctionName')
	) {
		const overloadDefinitions = variable.defs.filter(definition => definition.node.type === 'TSDeclareFunction');

		return overloadDefinitions.length > 0
			? overloadDefinitions.every(definition => isBooleanFunctionDefinition(definition, context))
			: variable.defs.every(definition => isBooleanFunctionDefinition(definition, context));
	}

	if (variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;
	const {name} = definition;

	if (name?.type !== 'Identifier') {
		return false;
	}

	if (!['Variable', 'Parameter', 'FunctionName'].includes(definition.type)) {
		return false;
	}

	// Destructuring patterns (`const {completed} = task`, `const [enabled] = list`) are intentionally not checked, since renaming a destructured binding is more involved than renaming a plain identifier.
	if (definition.type === 'Variable' && definition.node.id.type !== 'Identifier') {
		return false;
	}

	// A setter parameter's name is positional and dictated by the accessor, not chosen freely.
	if (definition.type === 'Parameter' && definition.node.parent?.kind === 'set') {
		return false;
	}

	const scope = sourceCode.getScope(name);

	if (name.typeAnnotation) {
		return isBooleanTypeAnnotation(name.typeAnnotation, context, scope)
			|| isBooleanFunctionTypeAnnotation(name.typeAnnotation, context, scope);
	}

	if (definition.type === 'Parameter') {
		const parameter = findParameter(definition.node.params, name);

		return parameter?.type === 'AssignmentPattern'
			&& isBooleanExpression(parameter.right, context);
	}

	if (isBooleanExpression(name, context)) {
		return true;
	}

	if (definition.type === 'Variable') {
		return isBooleanValue(definition.node.init, context);
	}

	if (definition.type === 'FunctionName') {
		return isBooleanFunctionDefinition(definition, context);
	}

	return false;
};

function getBooleanPropertyName(node, sourceCode) {
	if (
		!node.computed
		&& [
			'Identifier',
			'PrivateIdentifier',
		].includes(node.key?.type)
	) {
		return node.key.name;
	}

	if (
		node.key?.type === 'Literal'
		&& typeof node.key.value === 'string'
	) {
		return node.key.value;
	}

	const name = getPropertyName(node, sourceCode.getScope(node));

	return typeof name === 'string' ? name : undefined;
}

function isBooleanProperty(node, context) {
	const {sourceCode} = context;

	if (node.type === 'Property') {
		if (
			node.parent.type !== 'ObjectExpression'
			|| node.shorthand
			|| node.kind === 'set'
		) {
			return false;
		}

		return isBooleanValue(node.value, context);
	}

	if (
		node.type === 'MethodDefinition'
		|| node.type === 'TSAbstractMethodDefinition'
	) {
		return !['constructor', 'set'].includes(node.kind) && isBooleanFunction(node.value, context);
	}

	if (propertyDefinitionTypes.has(node.type)) {
		const scope = sourceCode.getScope(node);

		return isBooleanTypeAnnotation(node.typeAnnotation, context, scope)
			|| isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, scope)
			|| isBooleanValue(node.value, context);
	}

	if (node.type === 'TSPropertySignature') {
		const scope = sourceCode.getScope(node);

		return isBooleanTypeAnnotation(node.typeAnnotation, context, scope)
			|| isBooleanFunctionTypeAnnotation(node.typeAnnotation, context, scope);
	}

	if (node.type === 'TSMethodSignature') {
		return isBooleanTypeAnnotation(node.returnType, context, sourceCode.getScope(node));
	}

	return false;
}

function getSuggestions(variable, prefixes, context) {
	if (
		!shouldSuggestRename(variable)
		|| variable.references.some(reference => reference.vueUsedInTemplate)
	) {
		return;
	}

	const scopes = [
		...variable.references.map(reference => reference.from),
		variable.scope,
	];
	const usedReplacements = new Set();
	const suggestions = [];

	for (const prefix of prefixes) {
		const replacement = getAvailableVariableName(getReplacementName(variable.name, prefix), scopes);

		if (!replacement || usedReplacements.has(replacement)) {
			continue;
		}

		usedReplacements.add(replacement);
		suggestions.push({
			messageId: MESSAGE_ID_SUGGESTION,
			data: {replacement},
			fix: fixer => renameVariable(variable, replacement, context, fixer),
		});
	}

	return suggestions.length > 0 ? suggestions : undefined;
}

function isAutofixableVariable(variable, context) {
	const [definition] = variable.defs;
	if (
		variable.scope.type === 'global'
		|| definition?.type !== 'Variable'
		|| isInDeclareContext(definition.node)
		|| isFunction(definition.node.init)
		|| getVariableIdentifiers(variable).some(identifier =>
			isExportedIdentifier(identifier)
			|| isExportDefaultIdentifier(identifier)
			|| isExportSpecifierLocal(identifier),
		)
	) {
		return false;
	}

	const {sourceCode} = context;
	const scope = sourceCode.getScope(definition.name);

	return !isBooleanFunctionTypeAnnotation(definition.name.typeAnnotation, context, scope)
		&& !isBooleanFunctionReference(definition.node.init, context);
}

function isInDeclareContext(node) {
	for (let currentNode = node; currentNode; currentNode = currentNode.parent) {
		if (currentNode.declare) {
			return true;
		}
	}

	return false;
}

function getAutofix(variable, prefixes, context, suggestions) {
	if (
		!suggestions
		|| !isAutofixableVariable(variable, context)
	) {
		return;
	}

	const [prefix] = prefixes;
	const replacement = getReplacementName(variable.name, prefix);
	const suggestion = suggestions.find(suggestion => suggestion.data.replacement === replacement);

	return suggestion?.fix;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {checkProperties, prefixes} = prepareOptions(context.options[0]);

	if (prefixes.length === 0) {
		return;
	}

	const checkVariable = variable => {
		// `hasBooleanPrefix` is a cheap string check, so run it before the expensive
		// `isBooleanVariable` analysis.
		if (
			hasBooleanPrefix(variable.name, prefixes)
			|| !isBooleanVariable(variable, context)
		) {
			return;
		}

		const [definition] = variable.defs;
		const suggest = getSuggestions(variable, prefixes, context);

		context.report({
			node: definition.name,
			messageId: MESSAGE_ID,
			data: {
				name: variable.name,
				prefixes: formatPrefixes(prefixes),
			},
			fix: getAutofix(variable, prefixes, context, suggest),
			suggest,
		});
	};

	context.on('Program', node => {
		for (const scope of getScopes(context.sourceCode.getScope(node))) {
			for (const variable of scope.variables) {
				checkVariable(variable);
			}
		}
	});

	if (!checkProperties) {
		return;
	}

	const checkProperty = node => {
		const name = getBooleanPropertyName(node, context.sourceCode);

		if (
			!name
			|| hasBooleanPrefix(name, prefixes)
			|| !isBooleanProperty(node, context)
		) {
			return;
		}

		context.report({
			node: node.key,
			messageId: MESSAGE_ID,
			data: {
				name,
				prefixes: formatPrefixes(prefixes),
			},
		});
	};

	context.on('Property', checkProperty);
	context.on('ClassBody', node => {
		for (const element of node.body) {
			checkProperty(element);
		}
	});
	context.on('TSPropertySignature', checkProperty);
	context.on('TSMethodSignature', checkProperty);
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent naming for boolean names.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [
			{
				type: 'object',
				description: 'Rule options.',
				additionalProperties: false,
				properties: {
					checkProperties: {
						type: 'boolean',
						description: 'Whether to check object, class, and TypeScript property and method names.',
					},
					prefixes: {
						type: 'object',
						description: 'Boolean name prefixes to allow or disallow.',
						additionalProperties: {
							type: 'boolean',
							description: 'Whether the prefix is allowed.',
						},
						propertyNames: {
							description: 'Prefix name.',
							pattern: '^[a-z][a-zA-Z0-9]*$',
						},
					},
				},
			},
		],
		defaultOptions: [{}],
		messages,
	},
};

export default config;
