import {hasUnsafeArrowConversionReference} from './utils/index.js';

const MESSAGE_ID = 'prefer-short-arrow-method';
const MODE_ALWAYS = 'always';
const MODE_CONSISTENT_AS_NEEDED = 'consistent-as-needed';

const messages = {
	[MESSAGE_ID]: 'Prefer an arrow function property over a method with a single return.',
};

const returnArgumentTypesRequiringParentheses = new Set([
	'ObjectExpression',
	'SequenceExpression',
]);

const isPrototypeProperty = property =>
	!property.computed
	&& (
		(property.key.type === 'Identifier' && property.key.name === '__proto__')
		|| (property.key.type === 'Literal' && property.key.value === '__proto__')
	);

const getReturnStatement = property => {
	const {body} = property.value.body;

	if (body.length !== 1 || body[0].type !== 'ReturnStatement' || !body[0].argument) {
		return;
	}

	return body[0];
};

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

const getReturnArgumentText = (node, sourceCode) => {
	const text = sourceCode.getText(node);

	if (returnArgumentTypesRequiringParentheses.has(node.type) || text.trimStart().startsWith('{')) {
		return `(${text})`;
	}

	return text;
};

const getReplacementText = (property, returnStatement, sourceCode) => {
	const functionNode = property.value;
	const keyText = getKeyText(property, sourceCode);
	const asyncText = functionNode.async ? 'async ' : '';
	const parametersText = getParametersText(functionNode, sourceCode);
	const returnTypeText = getReturnTypeText(functionNode, sourceCode);
	const returnArgumentText = getReturnArgumentText(returnStatement.argument, sourceCode);

	return `${keyText}: ${asyncText}(${parametersText})${returnTypeText} => ${returnArgumentText}`;
};

const getFix = (property, returnStatement, context) => {
	const {sourceCode} = context;
	const functionNode = property.value;

	if (
		sourceCode.getCommentsInside(property).length > 0
		|| functionNode.typeParameters
	) {
		return;
	}

	return fixer => fixer.replaceText(property, getReplacementText(property, returnStatement, sourceCode));
};

const getConvertibleReturnStatement = (property, sourceCode) => {
	if (
		!isShorthandInitMethod(property)
		|| property.value.generator
		|| isPrototypeProperty(property)
		|| hasThisParameter(property.value)
		|| hasUnsafeArrowConversionReference(property.value, sourceCode.visitorKeys)
	) {
		return;
	}

	return getReturnStatement(property);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const mode = context.options[0];
	const objectCanBeAutofixedCache = new WeakMap();

	const canAutofixProperty = property => {
		const returnStatement = getConvertibleReturnStatement(property, sourceCode);
		return Boolean(returnStatement && getFix(property, returnStatement, context));
	};

	const canAutofixAllShorthandInitMethods = objectExpression => {
		const cachedResult = objectCanBeAutofixedCache.get(objectExpression);

		if (cachedResult !== undefined) {
			return cachedResult;
		}

		const result = objectExpression.properties.every(property =>
			!isShorthandInitMethod(property) || canAutofixProperty(property),
		);

		objectCanBeAutofixedCache.set(objectExpression, result);

		return result;
	};

	context.on('Property', property => {
		const returnStatement = getConvertibleReturnStatement(property, sourceCode);
		if (!returnStatement) {
			return;
		}

		if (
			mode === MODE_CONSISTENT_AS_NEEDED
			&& !canAutofixAllShorthandInitMethods(property.parent)
		) {
			return;
		}

		const problem = {
			node: property,
			messageId: MESSAGE_ID,
		};
		const fix = getFix(property, returnStatement, context);

		if (!fix) {
			return problem;
		}

		return {
			...problem,
			fix,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
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
