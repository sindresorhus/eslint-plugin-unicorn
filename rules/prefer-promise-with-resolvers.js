import {findVariable} from '@eslint-community/eslint-utils';
import {isNewExpression} from './ast/index.js';
import {isGlobalIdentifier} from './utils/index.js';

const MESSAGE_ID = 'prefer-promise-with-resolvers';
const messages = {
	[MESSAGE_ID]: 'Prefer `Promise.withResolvers()` over extracting resolver functions from `new Promise()`.',
};

const resolverProperties = [
	'resolve',
	'reject',
];

const getTypeArgumentsText = (node, sourceCode) => {
	const typeArguments = node.typeArguments ?? node.typeParameters;
	return typeArguments ? sourceCode.getText(typeArguments) : '';
};

const hasTypeAnnotation = node => Boolean(node.typeAnnotation);

const hasCommentsInsideRange = (sourceCode, range) => sourceCode.getAllComments().some(comment => {
	const commentRange = sourceCode.getRange(comment);
	return commentRange[0] >= range[0] && commentRange[1] <= range[1];
});

const isSupportedExecutor = node => (
	(node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')
	&& !node.async
	&& !node.generator
	&& node.body.type === 'BlockStatement'
);

const getAssignmentExpression = statement => {
	if (
		statement.type !== 'ExpressionStatement'
		|| statement.expression.type !== 'AssignmentExpression'
		|| statement.expression.operator !== '='
	) {
		return;
	}

	return statement.expression;
};

function getResolverExtractions(executor, context) {
	const {sourceCode} = context;
	const {params: resolverParameters} = executor;
	const resolverParameterNames = resolverParameters.map(parameter => parameter.name);
	const uniqueResolverParameterNames = new Set(resolverParameterNames);
	if (
		resolverParameters.length === 0
		|| resolverParameters.length > 2
		|| resolverParameters.some(parameter => parameter.type !== 'Identifier')
		|| uniqueResolverParameterNames.size !== resolverParameterNames.length
	) {
		return;
	}

	const resolverParameterVariables = new Set(resolverParameters.map(parameter => findVariable(sourceCode.getScope(parameter), parameter)));
	const extractions = [];
	const seenProperties = new Set();

	for (const statement of executor.body.body) {
		const assignmentExpression = getAssignmentExpression(statement);
		if (!assignmentExpression) {
			return;
		}

		const {left, right} = assignmentExpression;
		if (left.type !== 'Identifier' || right.type !== 'Identifier') {
			return;
		}

		const parameterIndex = resolverParameters.findIndex(parameter => parameter.name === right.name);
		const property = resolverProperties[parameterIndex];
		if (property === undefined || seenProperties.has(property)) {
			return;
		}

		const leftVariable = findVariable(sourceCode.getScope(left), left);
		if (!leftVariable || resolverParameterVariables.has(leftVariable)) {
			return;
		}

		seenProperties.add(property);
		extractions.push({
			property,
			target: left,
			targetVariable: leftVariable,
		});
	}

	return extractions.length > 0 ? extractions : undefined;
}

const isUninitializedLetDeclaration = (node, extractionVariables) => (
	node.type === 'VariableDeclaration'
	&& node.kind === 'let'
	&& node.declarations.length > 0
	&& node.declarations.every(declarator => (
		declarator.id.type === 'Identifier'
		&& !declarator.id.typeAnnotation
		&& !declarator.init
		&& extractionVariables.has(declarator.id.name)
	))
);

const getPreviousStatement = node => {
	if (!Array.isArray(node.parent.body)) {
		return;
	}

	const statements = node.parent.body;
	return statements[statements.indexOf(node) - 1];
};

const getDeclarationVariable = (declarator, sourceCode) => findVariable(sourceCode.getScope(declarator.id), declarator.id);

function getResolverDeclarations(promiseDeclaration, extractions, sourceCode) {
	const extractionVariables = new Set(extractions.map(({targetVariable}) => targetVariable));
	const declarations = [];

	for (
		let statement = getPreviousStatement(promiseDeclaration);
		statement && isUninitializedLetDeclaration(statement, new Set(extractions.map(({target}) => target.name)));
		statement = getPreviousStatement(statement)
	) {
		declarations.unshift(statement);

		const declaredVariables = new Set(declarations.flatMap(({declarations}) => declarations.map(declarator => getDeclarationVariable(declarator, sourceCode))));
		if (declaredVariables.size === extractionVariables.size) {
			return declarations.every(({declarations}) => declarations.length === 1 || declarations.length === extractionVariables.size)
				&& [...extractionVariables].every(variable => declaredVariables.has(variable))
				? declarations
				: undefined;
		}
	}
}

const hasOnlyExtractionWrites = extractions => extractions.every(({target, targetVariable}) => (
	targetVariable.references.every(reference => !reference.isWrite() || reference.identifier === target)
));

const getBindingText = (property, localName) => property === localName ? property : `${property}: ${localName}`;

function getFix(newExpression, extractions, context) {
	const {sourceCode} = context;
	const promiseDeclarator = newExpression.parent;
	if (
		promiseDeclarator.type !== 'VariableDeclarator'
		|| promiseDeclarator.init !== newExpression
		|| promiseDeclarator.id.type !== 'Identifier'
		|| promiseDeclarator.id.typeAnnotation
	) {
		return;
	}

	const promiseDeclaration = promiseDeclarator.parent;
	if (
		promiseDeclaration.type !== 'VariableDeclaration'
		|| promiseDeclaration.kind !== 'const'
		|| promiseDeclaration.declarations.length !== 1
	) {
		return;
	}

	const [executor] = newExpression.arguments;
	if (executor.params.some(parameter => hasTypeAnnotation(parameter))) {
		return;
	}

	const resolverDeclarations = getResolverDeclarations(promiseDeclaration, extractions, sourceCode);
	if (!resolverDeclarations || !hasOnlyExtractionWrites(extractions)) {
		return;
	}

	const replaceRange = [
		sourceCode.getRange(resolverDeclarations[0])[0],
		sourceCode.getRange(promiseDeclaration)[1],
	];
	if (hasCommentsInsideRange(sourceCode, replaceRange)) {
		return;
	}

	const orderedExtractions = resolverProperties.flatMap(property => extractions.filter(extraction => extraction.property === property));
	const bindings = [
		getBindingText('promise', promiseDeclarator.id.name),
		...orderedExtractions.map(({property, target}) => getBindingText(property, target.name)),
	].join(', ');

	const typeArgumentsText = getTypeArgumentsText(newExpression, sourceCode);

	return fixer => fixer.replaceTextRange(
		replaceRange,
		`const {${bindings}} = Promise.withResolvers${typeArgumentsText}();`,
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('NewExpression', newExpression => {
		if (
			!isNewExpression(newExpression, {
				name: 'Promise',
				argumentsLength: 1,
			})
			|| !isGlobalIdentifier(newExpression.callee, context)
		) {
			return;
		}

		const [executor] = newExpression.arguments;
		if (!isSupportedExecutor(executor)) {
			return;
		}

		const extractions = getResolverExtractions(executor, context);
		if (!extractions) {
			return;
		}

		return {
			node: newExpression,
			messageId: MESSAGE_ID,
			fix: getFix(newExpression, extractions, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Promise.withResolvers()` when extracting resolver functions from `new Promise()`.',
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
