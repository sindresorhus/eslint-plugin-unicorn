import {
	getCommentSafeProblem,
	getConciseArrowBodyText,
	getFunctionReturnExpression,
	hasUnsafeArrowConversionReference,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-short-arrow-method';
const MODE_ALWAYS = 'always';
const MODE_CONSISTENT_AS_NEEDED = 'consistent-as-needed';

const messages = {
	[MESSAGE_ID]: 'Prefer an arrow function property over a method with a single return.',
};

const isPrototypeProperty = property =>
	!property.computed
	&& (
		(property.key.type === 'Identifier' && property.key.name === '__proto__')
		|| (property.key.type === 'Literal' && property.key.value === '__proto__')
	);

const getKeyText = (property, sourceCode) =>
	property.computed
		? `[${sourceCode.getText(property.key)}]`
		: sourceCode.getText(property.key);

const getParametersText = (functionNode, sourceCode) =>
	functionNode.params.map(parameter => sourceCode.getText(parameter)).join(', ');

const hasThisParameter = functionNode =>
	functionNode.params.some(parameter => parameter.type === 'Identifier' && parameter.name === 'this');

const isShorthandInitMethod = property =>
	property.type === 'Property'
	&& property.method
	&& property.kind === 'init';

const getReturnTypeText = (functionNode, sourceCode) =>
	functionNode.returnType
		? sourceCode.getText(functionNode.returnType)
		: '';

const getReplacementText = (property, returnExpression, context) => {
	const {sourceCode} = context;
	const functionNode = property.value;
	const keyText = getKeyText(property, sourceCode);
	const asyncText = functionNode.async ? 'async ' : '';
	const parametersText = getParametersText(functionNode, sourceCode);
	const returnTypeText = getReturnTypeText(functionNode, sourceCode);
	const returnArgumentText = getConciseArrowBodyText(returnExpression, context);

	return `${keyText}: ${asyncText}(${parametersText})${returnTypeText} => ${returnArgumentText}`;
};

const getFix = (property, returnExpression, context) => {
	const functionNode = property.value;

	if (functionNode.typeParameters) {
		return;
	}

	return fixer => fixer.replaceText(property, getReplacementText(property, returnExpression, context));
};

const getConvertibleReturnExpression = (property, sourceCode) => {
	if (
		!isShorthandInitMethod(property)
		|| property.value.generator
		|| isPrototypeProperty(property)
		|| hasThisParameter(property.value)
		|| hasUnsafeArrowConversionReference(property.value, sourceCode.visitorKeys)
	) {
		return;
	}

	return getFunctionReturnExpression(property.value);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const mode = context.options[0];
	const objectCanBeReportedCache = new WeakMap();

	const canReportProperty = property => {
		const returnExpression = getConvertibleReturnExpression(property, sourceCode);
		return Boolean(returnExpression
			&& getFix(property, returnExpression, context));
	};

	const canReportAllShorthandInitMethods = objectExpression => {
		const cachedResult = objectCanBeReportedCache.get(objectExpression);

		if (cachedResult !== undefined) {
			return cachedResult;
		}

		const result = objectExpression.properties.every(property =>
			!isShorthandInitMethod(property) || canReportProperty(property),
		);

		objectCanBeReportedCache.set(objectExpression, result);

		return result;
	};

	context.on('Property', property => {
		const returnExpression = getConvertibleReturnExpression(property, sourceCode);
		if (!returnExpression) {
			return;
		}

		if (
			mode === MODE_CONSISTENT_AS_NEEDED
			&& !canReportAllShorthandInitMethods(property.parent)
		) {
			return;
		}

		let problem = {
			node: property,
			messageId: MESSAGE_ID,
			fix: getFix(property, returnExpression, context),
		};
		const affectedProperties = mode === MODE_CONSISTENT_AS_NEEDED
			? property.parent.properties.filter(property => isShorthandInitMethod(property))
			: [property];
		for (const affectedProperty of affectedProperties) {
			problem = getCommentSafeProblem(context, problem, affectedProperty);
		}

		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer arrow function properties over methods with a single return.',
			recommended: false,
		},
		fixable: 'code',
		schema: [
			{
				description: 'Mode to use when reporting methods.',
				enum: [
					MODE_ALWAYS,
					MODE_CONSISTENT_AS_NEEDED,
				],
			},
		],
		defaultOptions: [MODE_ALWAYS],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
