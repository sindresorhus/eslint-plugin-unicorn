import {findVariable} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isIdentifierNamed,
	isMethodCall,
	isNewExpression,
} from './ast/index.js';
import {
	getConciseArrowBodyText,
	getFunctionOnlyExpression,
	getParenthesizedRange,
	getTypeArgumentsText,
	hasCommentInRange,
	isGlobalIdentifier,
	unwrapChainAndTypeScriptExpression,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-promise-try';
const messages = {
	[MESSAGE_ID]: 'Prefer `Promise.try()` over promise-wrapping boilerplate.',
};

const isSupportedExecutor = node => (
	node.type === 'ArrowFunctionExpression'
	&& !node.async
	&& !node.generator
	&& node.params.length === 1
	&& node.params[0].type === 'Identifier'
);

const isResolveCall = (node, resolveName) => (
	isCallExpression(node, {
		argumentsLength: 1,
		optional: false,
	})
	&& isIdentifierNamed(node.callee, resolveName)
);

const getPromiseTryArgumentText = (resolvedExpression, context) => `() => ${getConciseArrowBodyText(resolvedExpression, context)}`;

const hasExecutorTypeSyntax = executor => Boolean(
	executor.params[0].typeAnnotation
	|| executor.returnType
	|| executor.typeParameters,
);

const isPartOfNewExpressionCallee = node => {
	let currentNode = node;
	let parentNode = node.parent;

	while (
		parentNode.type === 'MemberExpression'
		&& parentNode.object === currentNode
	) {
		currentNode = parentNode;
		parentNode = parentNode.parent;
	}

	return (
		parentNode.type === 'NewExpression'
		&& parentNode.callee === currentNode
	);
};

function getFix(newExpression, resolvedExpression, context) {
	const [executor] = newExpression.arguments;
	if (
		hasExecutorTypeSyntax(executor)
		|| isPartOfNewExpressionCallee(newExpression)
	) {
		return;
	}

	const replaceRange = getParenthesizedRange(newExpression, context);
	if (hasCommentInRange(context, replaceRange)) {
		return;
	}

	return fixer => fixer.replaceTextRange(
		replaceRange,
		`Promise.try${getTypeArgumentsText(newExpression, context)}(${getPromiseTryArgumentText(resolvedExpression, context)})`,
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
	return variable.references.some(reference => isReferenceInsideNode(reference, node, context.sourceCode));
};

function getResolvedCallExpression(newExpression, context) {
	const [executor] = newExpression.arguments;
	if (!isSupportedExecutor(executor)) {
		return;
	}

	const expression = getFunctionOnlyExpression(executor);
	if (!expression || !isResolveCall(expression, executor.params[0].name)) {
		return;
	}

	const resolvedValue = expression.arguments[0];
	if (!isCallExpression(unwrapChainAndTypeScriptExpression(resolvedValue))) {
		return;
	}

	if (referencesExecutorParameter(resolvedValue, executor, context)) {
		return;
	}

	return resolvedValue;
}

const isThenCallbackCandidate = node => {
	node = unwrapTypeScriptExpression(node);

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

/**
@param {import('eslint').Rule.RuleContext} context
*/
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
