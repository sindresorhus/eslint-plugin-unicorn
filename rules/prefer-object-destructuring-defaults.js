import {getPropertyName, hasSideEffect} from '@eslint-community/eslint-utils';
import {getParenthesizedText, getReferences} from './utils/index.js';

const MESSAGE_ID = 'prefer-object-destructuring-defaults';
const MESSAGE_ID_SUGGESTION = 'prefer-object-destructuring-defaults/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer object destructuring defaults over default object literals with spread.',
	[MESSAGE_ID_SUGGESTION]: 'Use object destructuring defaults.',
};

const objectPrototypePropertyNames = new Set(Object.getOwnPropertyNames(Object.prototype));
const hasSideEffectOptions = {
	considerGetters: true,
	considerImplicitTypeConversion: true,
};

const isSimpleProperty = property =>
	property.type === 'Property'
	&& property.kind === 'init'
	&& !property.computed
	&& !property.method;

const isNodeInside = (node, parent, sourceCode) => {
	const [start, end] = sourceCode.getRange(node);
	const [parentStart, parentEnd] = sourceCode.getRange(parent);

	return start >= parentStart && end <= parentEnd;
};

const referencesPatternBinding = (node, bindingNames, context) =>
	getReferences(context.sourceCode.getScope(node)).some(reference =>
		bindingNames.has(reference.identifier.name)
		&& isNodeInside(reference.identifier, node, context.sourceCode),
	);

const getSimplePatternProperties = (objectPattern, context) => {
	if (objectPattern.typeAnnotation) {
		return;
	}

	const properties = [];

	for (const property of objectPattern.properties) {
		if (!(
			isSimpleProperty(property)
			&& property.value.type === 'Identifier'
		)) {
			return;
		}

		const name = getPropertyName(property, context.sourceCode.getScope(property));
		if (name === null || objectPrototypePropertyNames.has(name)) {
			return;
		}

		properties.push({
			node: property,
			name,
		});
	}

	return properties;
};

const getDefaultProperties = (objectExpression, context) => {
	const {properties} = objectExpression;
	const spreadElement = properties.at(-1);
	if (
		spreadElement?.type !== 'SpreadElement'
		|| hasSideEffect(spreadElement.argument, context.sourceCode, hasSideEffectOptions)
	) {
		return;
	}

	const defaultProperties = new Map();

	for (const property of properties.slice(0, -1)) {
		if (!isSimpleProperty(property) || hasSideEffect(property.value, context.sourceCode, hasSideEffectOptions)) {
			return;
		}

		const name = getPropertyName(property, context.sourceCode.getScope(property));
		if (name === null || defaultProperties.has(name)) {
			return;
		}

		defaultProperties.set(name, property);
	}

	return {
		defaultProperties,
		spreadElement,
	};
};

const getReplacementPatternPropertyText = (patternProperty, defaultProperty, context) => {
	const {sourceCode} = context;
	const valueText = sourceCode.getText(patternProperty.node.value);
	const defaultText = getParenthesizedText(defaultProperty.value, context);

	if (patternProperty.node.shorthand) {
		return `${valueText} = ${defaultText}`;
	}

	return `${sourceCode.getText(patternProperty.node.key)}: ${valueText} = ${defaultText}`;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', node => {
		const {id, init} = node;

		if (!(
			id.type === 'ObjectPattern'
			&& init?.type === 'ObjectExpression'
			&& context.sourceCode.getCommentsInside(node).length === 0
		)) {
			return;
		}

		const patternProperties = getSimplePatternProperties(id, context);
		const defaultPropertiesResult = getDefaultProperties(init, context);
		if (!patternProperties || patternProperties.length === 0 || !defaultPropertiesResult) {
			return;
		}

		const {defaultProperties, spreadElement} = defaultPropertiesResult;
		if (patternProperties.length !== defaultProperties.size) {
			return;
		}

		const bindingNames = new Set(patternProperties.map(patternProperty => patternProperty.node.value.name));
		const replacementProperties = [];
		for (const patternProperty of patternProperties) {
			const defaultProperty = defaultProperties.get(patternProperty.name);
			if (!defaultProperty || referencesPatternBinding(defaultProperty.value, bindingNames, context)) {
				return;
			}

			replacementProperties.push(getReplacementPatternPropertyText(patternProperty, defaultProperty, context));
		}

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(
						node,
						`{${replacementProperties.join(', ')}} = {${context.sourceCode.getText(spreadElement)}}`,
					),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer object destructuring defaults over default object literals with spread.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
