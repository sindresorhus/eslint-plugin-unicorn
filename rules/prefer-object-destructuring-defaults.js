import {getPropertyName, hasSideEffect} from '@eslint-community/eslint-utils';
import {getParenthesizedText, isParenthesized} from './utils/index.js';

const MESSAGE_ID = 'prefer-object-destructuring-defaults';
const MESSAGE_ID_SUGGESTION = 'prefer-object-destructuring-defaults/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer object destructuring defaults over default object literals with spread.',
	[MESSAGE_ID_SUGGESTION]: 'Use object destructuring defaults.',
};

const objectPrototypePropertyNames = new Set(Object.getOwnPropertyNames(Object.prototype));

const needsParenthesesBeforeNullishCoalescing = node =>
	[
		'AssignmentExpression',
		'ArrowFunctionExpression',
		'ConditionalExpression',
		'LogicalExpression',
		'SequenceExpression',
		'YieldExpression',
	].includes(node.type);

const isSimpleProperty = property =>
	property.type === 'Property'
	&& property.kind === 'init'
	&& !property.computed
	&& !property.method;

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
		if (!name || objectPrototypePropertyNames.has(name)) {
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
	if (spreadElement?.type !== 'SpreadElement') {
		return;
	}

	const defaultProperties = new Map();

	for (const property of properties.slice(0, -1)) {
		if (!isSimpleProperty(property) || hasSideEffect(property.value, context.sourceCode, {
			considerGetters: true,
			considerImplicitTypeConversion: true,
		})) {
			return;
		}

		const name = getPropertyName(property, context.sourceCode.getScope(property));
		if (!name || defaultProperties.has(name)) {
			return;
		}

		defaultProperties.set(name, property);
	}

	return {
		defaultProperties,
		spreadElement,
	};
};

const getSpreadSourceText = (node, context) => {
	const text = getParenthesizedText(node, context);

	if (
		!isParenthesized(node, context)
		&& needsParenthesesBeforeNullishCoalescing(node)
	) {
		return `(${text})`;
	}

	return text;
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

		const replacementProperties = [];
		for (const patternProperty of patternProperties) {
			const defaultProperty = defaultProperties.get(patternProperty.name);
			if (!defaultProperty) {
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
						`{${replacementProperties.join(', ')}} = ${getSpreadSourceText(spreadElement.argument, context)} ?? {}`,
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
			recommended: 'unopinionated',
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
