import {findVariable} from '@eslint-community/eslint-utils';
import {
	isEmptyArrayExpression,
	isMethodCall,
} from './ast/index.js';
import {
	containsSuspensionPoint,
	getNextNode,
	getParenthesizedText,
	getVariableIdentifiers,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-array-from-async';
const messages = {
	[MESSAGE_ID]: 'Prefer `Array.fromAsync()` over `for await…of` array accumulation.',
};

const arrowBodyParenthesizedExpressionTypes = new Set([
	'ObjectExpression',
	'SequenceExpression',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const isIdentifierNamed = (node, name) => node.type === 'Identifier' && node.name === name;

const getEmptyArrayDeclarator = node => {
	if (
		node.declarations.length !== 1
		|| (node.kind !== 'const' && node.kind !== 'let')
	) {
		return;
	}

	const [declarator] = node.declarations;
	if (
		declarator.id.type !== 'Identifier'
		|| !declarator.init
		|| !isEmptyArrayExpression(declarator.init)
	) {
		return;
	}

	return declarator;
};

const getOnlyExpression = node => {
	if (node.type === 'ExpressionStatement') {
		return node.expression;
	}

	if (
		node.type === 'BlockStatement'
		&& node.body.length === 1
		&& node.body[0].type === 'ExpressionStatement'
	) {
		return node.body[0].expression;
	}
};

const getSingleForOfBinding = node => {
	if (
		node.left.type !== 'VariableDeclaration'
		|| node.left.declarations.length !== 1
		|| (node.left.kind !== 'const' && node.left.kind !== 'let')
	) {
		return;
	}

	const [{id, init}] = node.left.declarations;
	if (init) {
		return;
	}

	if (id.type !== 'Identifier') {
		return;
	}

	return id;
};

const referencesVariable = (variable, node, context) => {
	const range = context.sourceCode.getRange(node);

	return getVariableIdentifiers(variable).some(identifier => {
		const [start, end] = context.sourceCode.getRange(identifier);

		return start >= range[0] && end <= range[1];
	});
};

const isReferenceInsideNode = (reference, node, context) => {
	const [referenceStart, referenceEnd] = context.sourceCode.getRange(reference.identifier);
	const [nodeStart, nodeEnd] = context.sourceCode.getRange(node);

	return referenceStart >= nodeStart && referenceEnd <= nodeEnd;
};

const hasWriteReferenceInsideNode = (variable, node, context) =>
	variable.references.some(reference =>
		!reference.init
		&& reference.isWrite()
		&& isReferenceInsideNode(reference, node, context),
	);

const isGlobalArrayAvailable = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), 'Array');

	return !variable || variable.defs.length === 0;
};

const getArrowBodyText = (node, context) => {
	const text = context.sourceCode.getText(node);

	return arrowBodyParenthesizedExpressionTypes.has(node.type) ? `(${text})` : text;
};

const getVariableTargetText = (declarator, context) => {
	const {sourceCode} = context;
	const equalsToken = sourceCode.getTokenBefore(declarator.init, token => token.value === '=');
	const [start] = sourceCode.getRange(declarator.id);
	const [end] = sourceCode.getRange(equalsToken);

	return sourceCode.text.slice(start, end).trimEnd();
};

const getArrayFromAsyncText = ({
	iterable,
	binding,
	body,
	context,
}) => {
	let text = `Array.fromAsync(${getParenthesizedText(iterable, context)}`;

	if (body) {
		text += `, ${context.sourceCode.getText(binding)} => ${getArrowBodyText(body, context)}`;
	}

	return `${text})`;
};

const isDirectElementPush = (pushArgument, binding) =>
	isIdentifierNamed(pushArgument, binding.name);

const getMapperBody = ({
	pushArgument,
	variable,
	context,
}) => {
	if (
		pushArgument.type !== 'AwaitExpression'
		|| referencesVariable(variable, pushArgument.argument, context)
		|| containsSuspensionPoint(pushArgument.argument, context.sourceCode.visitorKeys)
	) {
		return;
	}

	return pushArgument.argument;
};

const getLoopProblem = (declaration, context) => {
	const declarator = getEmptyArrayDeclarator(declaration);
	if (!declarator || !isGlobalArrayAvailable(declaration, context)) {
		return;
	}

	const loop = getNextNode(declaration, context);
	if (loop?.type !== 'ForOfStatement' || !loop.await) {
		return;
	}

	const expression = getOnlyExpression(loop.body);
	if (!expression) {
		return;
	}

	const binding = getSingleForOfBinding(loop);
	if (!binding) {
		return;
	}

	const {sourceCode} = context;
	const arrayName = declarator.id.name;
	const variable = sourceCode.getDeclaredVariables(declarator)[0];
	const [bindingVariable] = sourceCode.getDeclaredVariables(loop.left);
	if (
		binding.name === arrayName
		|| referencesVariable(variable, loop.right, context)
	) {
		return;
	}

	if (!isMethodCall(expression, {
		method: 'push',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	}) || !isIdentifierNamed(expression.callee.object, arrayName)) {
		return;
	}

	const [pushArgument] = expression.arguments;
	const isDirectCollection = isDirectElementPush(pushArgument, binding);
	let body;

	if (!isDirectCollection) {
		body = getMapperBody({
			pushArgument,
			variable,
			context,
		});
		if (
			!body
			|| (
				loop.left.kind === 'const'
				&& hasWriteReferenceInsideNode(bindingVariable, body, context)
			)
		) {
			return;
		}
	}

	const replaceRange = [
		sourceCode.getRange(declaration)[0],
		sourceCode.getRange(loop)[1],
	];
	if (wouldRemoveComments(context, replaceRange)) {
		return;
	}

	return {
		node: loop,
		messageId: MESSAGE_ID,
		fix: fixer => fixer.replaceTextRange(
			replaceRange,
			`${declaration.kind} ${getVariableTargetText(declarator, context)} = await ${getArrayFromAsyncText({
				iterable: loop.right,
				binding,
				body,
				context,
			})};`,
		),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclaration', declaration => getLoopProblem(declaration, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array.fromAsync()` over `for await…of` array accumulation.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
