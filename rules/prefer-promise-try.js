import {findVariable} from '@eslint-community/eslint-utils';
import {isCallExpression, isMethodCall, isNewExpression} from './ast/index.js';
import {getParenthesizedRange, isGlobalIdentifier} from './utils/index.js';

const MESSAGE_ID = 'prefer-promise-try';
const messages = {
	[MESSAGE_ID]: 'Prefer `Promise.try()` over promise-wrapping boilerplate.',
};

const getTypeArgumentsText = (node, sourceCode) => {
	const typeArguments = node.typeArguments ?? node.typeParameters;
	return typeArguments ? sourceCode.getText(typeArguments) : '';
};

const hasCommentsInsideRange = (sourceCode, range) => sourceCode.getAllComments().some(comment => {
	const commentRange = sourceCode.getRange(comment);
	return commentRange[0] >= range[0] && commentRange[1] <= range[1];
});

const isSupportedExecutor = node => (
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& !node.generator
	&& node.params.length === 1
	&& node.params[0].type === 'Identifier'
);

const getOnlyExpression = node => {
	if (node.body.type !== 'BlockStatement') {
		return node.body;
	}

	if (
		node.body.body.length !== 1
		|| node.body.body[0].type !== 'ExpressionStatement'
	) {
		return;
	}

	return node.body.body[0].expression;
};

const isIdentifierReference = (node, name) => (
	node.type === 'Identifier'
	&& node.name === name
);

const isResolveCall = (node, resolveName) => (
	isCallExpression(node, {
		argumentsLength: 1,
		optional: false,
	})
	&& isIdentifierReference(node.callee, resolveName)
);

const getPromiseTryArgumentText = (callExpression, sourceCode) => `() => ${sourceCode.getText(callExpression)}`;

const hasExecutorTypeSyntax = executor => Boolean(
	executor.params[0].typeAnnotation
	|| executor.returnType
	|| executor.typeParameters,
);

function getFix(newExpression, resolvedCallExpression, context) {
	const {sourceCode} = context;
	const [executor] = newExpression.arguments;
	if (
		hasExecutorTypeSyntax(executor)
		|| (
			newExpression.parent.type === 'NewExpression'
			&& newExpression.parent.callee === newExpression
		)
	) {
		return;
	}

	const replaceRange = getParenthesizedRange(newExpression, context);
	if (hasCommentsInsideRange(sourceCode, replaceRange)) {
		return;
	}

	return fixer => fixer.replaceTextRange(
		replaceRange,
		`Promise.try${getTypeArgumentsText(newExpression, sourceCode)}(${getPromiseTryArgumentText(resolvedCallExpression, sourceCode)})`,
	);
}

const isReferenceInsideNode = (reference, node, sourceCode) => {
	const referenceRange = sourceCode.getRange(reference.identifier);
	const nodeRange = sourceCode.getRange(node);
	return referenceRange[0] >= nodeRange[0] && referenceRange[1] <= nodeRange[1];
};

const referencesExecutorParameter = (node, executor, context) => {
	const parameter = executor.params[0];
	const variable = findVariable(context.sourceCode.getScope(parameter), parameter);
	return variable?.references.some(reference => isReferenceInsideNode(reference, node, context.sourceCode)) ?? false;
};

function getResolvedCallExpression(newExpression, context) {
	const [executor] = newExpression.arguments;
	if (!isSupportedExecutor(executor)) {
		return;
	}

	const expression = getOnlyExpression(executor);
	if (!expression || !isResolveCall(expression, executor.params[0].name)) {
		return;
	}

	const [resolvedValue] = expression.arguments;
	if (!isCallExpression(resolvedValue, {optional: false})) {
		return;
	}

	if (referencesExecutorParameter(resolvedValue, executor, context)) {
		return;
	}

	return resolvedValue;
}

const isThenCallbackCandidate = node => {
	switch (node.type) {
		case 'ArrowFunctionExpression':
		case 'FunctionExpression':
		case 'MemberExpression': {
			return true;
		}

		case 'Identifier': {
			return node.name !== 'undefined';
		}

		default: {
			return false;
		}
	}
};

const isPromiseResolveCall = (node, context) => (
	isMethodCall(node, {
		object: 'Promise',
		methods: ['resolve'],
		optionalCall: false,
		optionalMember: false,
		argumentsLength: 0,
	})
	&& isGlobalIdentifier(node.callee.object, context)
);

const isPromiseResolveThenCall = (node, context) => (
	isMethodCall(node, {
		methods: ['then'],
		optionalCall: false,
		optionalMember: false,
		computed: false,
		argumentsLength: 1,
	})
	&& isPromiseResolveCall(node.callee.object, context)
	&& isThenCallbackCandidate(node.arguments[0])
);

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

		const resolvedCallExpression = getResolvedCallExpression(newExpression, context);
		if (!resolvedCallExpression) {
			return;
		}

		return {
			node: newExpression,
			messageId: MESSAGE_ID,
			fix: getFix(newExpression, resolvedCallExpression, context),
		};
	});

	context.on('CallExpression', callExpression => {
		if (!isPromiseResolveThenCall(callExpression, context)) {
			return;
		}

		return {
			node: callExpression,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Promise.try()` over promise-wrapping boilerplate.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
