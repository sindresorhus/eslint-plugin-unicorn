import {
	findVariable,
	isCommaToken,
} from '@eslint-community/eslint-utils';
import {
	isEmptyArrayExpression,
	isMethodCall,
} from './ast/index.js';
import {
	getNextNode,
	getParenthesizedRange,
	getParenthesizedText,
	getVariableIdentifiers,
	isArray,
	isParenthesized,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID_ERROR = 'prefer-array-from-map/error';
const MESSAGE_ID_SUGGESTION = 'prefer-array-from-map/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Pass the mapping function to `Array.from()` directly.',
	[MESSAGE_ID_SUGGESTION]: 'Use the `Array.from()` mapping function argument.',
};

const arrowBodyParenthesizedExpressionTypes = new Set([
	'ObjectExpression',
	'SequenceExpression',
	'TSAsExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const suspendingExpressionTypes = new Set([
	'AwaitExpression',
	'YieldExpression',
]);

const isArrowFunctionWithSupportedParameters = node => (
	node.type === 'ArrowFunctionExpression'
	&& node.params.length <= 2
	&& node.params.every(parameter => parameter.type !== 'RestElement')
);

const hasTypeArguments = node => node.typeArguments || node.typeParameters;

const isFlatCallWithDefaultDepth = node => (
	isMethodCall(node, {
		method: 'flat',
		optionalCall: false,
		optionalMember: false,
	})
	&& (
		node.arguments.length === 0
		|| (
			node.arguments.length === 1
			&& node.arguments[0].type === 'Literal'
			&& node.arguments[0].raw === '1'
		)
	)
);

const isFollowedByDefaultFlatCall = node => (
	node.parent?.type === 'MemberExpression'
	&& node.parent.object === node
	&& node.parent.parent?.type === 'CallExpression'
	&& node.parent.parent.callee === node.parent
	&& isFlatCallWithDefaultDepth(node.parent.parent)
);

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

	if (id.type === 'Identifier') {
		return {element: id};
	}

	if (
		id.type === 'ArrayPattern'
		&& id.elements.length === 2
		&& id.elements.every(element => element?.type === 'Identifier')
	) {
		const [index, element] = id.elements;

		return {
			index,
			element,
		};
	}
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

const referencesVariable = (variable, node, context) => {
	const range = context.sourceCode.getRange(node);

	return getVariableIdentifiers(variable).some(identifier => {
		const [start, end] = context.sourceCode.getRange(identifier);

		return start >= range[0] && end <= range[1];
	});
};

const hasSuspendingExpression = (node, visitorKeys) => {
	if (suspendingExpressionTypes.has(node.type)) {
		return true;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			if (value.some(child => child?.type && hasSuspendingExpression(child, visitorKeys))) {
				return true;
			}
		} else if (value?.type && hasSuspendingExpression(value, visitorKeys)) {
			return true;
		}
	}

	return false;
};

const isGlobalArrayAvailable = (node, context) => {
	const variable = findVariable(context.sourceCode.getScope(node), 'Array');

	return !variable || variable.defs.length === 0;
};

const getArrayFromText = ({
	iterable,
	parameters,
	body,
	context,
}) => `Array.from(${getParenthesizedText(iterable, context)}, ${parameters} => ${getArrowBodyText(body, context)})`;

const getPushReplacement = ({
	expression,
	binding,
	loop,
	arrayName,
	variable,
	context,
}) => {
	const {sourceCode} = context;
	if (
		!isMethodCall(expression, {
			method: 'push',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isIdentifierNamed(expression.callee.object, arrayName)
		|| referencesVariable(variable, expression.arguments[0], context)
		|| hasSuspendingExpression(expression.arguments[0], sourceCode.visitorKeys)
	) {
		return;
	}

	const [pushedNode] = expression.arguments;
	if (!binding.index) {
		if (isIdentifierNamed(pushedNode, binding.element.name)) {
			return;
		}

		return getArrayFromText({
			iterable: loop.right,
			parameters: sourceCode.getText(binding.element),
			body: pushedNode,
			context,
		});
	}

	if (!isMethodCall(loop.right, {
		method: 'entries',
		argumentsLength: 0,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const entriesReceiver = loop.right.callee.object;
	return isArray(entriesReceiver, context)
		? getArrayFromText({
			iterable: entriesReceiver,
			parameters: `(${sourceCode.getText(binding.element)}, ${sourceCode.getText(binding.index)})`,
			body: pushedNode,
			context,
		})
		: getArrayFromText({
			iterable: loop.right,
			parameters: `([${sourceCode.getText(binding.index)}, ${sourceCode.getText(binding.element)}])`,
			body: pushedNode,
			context,
		});
};

const getAssignmentReplacement = ({
	expression,
	binding,
	loop,
	arrayName,
	variable,
	context,
}) => {
	if (
		!binding.index
		|| !isMethodCall(loop.right, {
			method: 'entries',
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isArray(loop.right.callee.object, context)
		|| expression.type !== 'AssignmentExpression'
		|| expression.operator !== '='
		|| expression.left.type !== 'MemberExpression'
		|| !expression.left.computed
		|| !isIdentifierNamed(expression.left.object, arrayName)
		|| !isIdentifierNamed(expression.left.property, binding.index.name)
		|| referencesVariable(variable, expression.right, context)
		|| hasSuspendingExpression(expression.right, context.sourceCode.visitorKeys)
	) {
		return;
	}

	const {sourceCode} = context;
	return getArrayFromText({
		iterable: loop.right.callee.object,
		parameters: `(${sourceCode.getText(binding.element)}, ${sourceCode.getText(binding.index)})`,
		body: expression.right,
		context,
	});
};

const getLoopProblem = (declaration, context) => {
	const declarator = getEmptyArrayDeclarator(declaration);
	if (!declarator || !isGlobalArrayAvailable(declaration, context)) {
		return;
	}

	const loop = getNextNode(declaration, context);
	if (loop?.type !== 'ForOfStatement' || loop.await) {
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
	if (
		binding.element.name === arrayName
		|| binding.index?.name === arrayName
		|| referencesVariable(variable, loop.right, context)
	) {
		return;
	}

	const replacement = getPushReplacement({
		expression,
		binding,
		loop,
		arrayName,
		variable,
		context,
	}) ?? getAssignmentReplacement({
		expression,
		binding,
		loop,
		arrayName,
		variable,
		context,
	});

	if (!replacement) {
		return;
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
		messageId: MESSAGE_ID_ERROR,
		fix: fixer => fixer.replaceTextRange(
			replaceRange,
			`${declaration.kind} ${getVariableTargetText(declarator, context)} = ${replacement};`,
		),
	};
};

const getMapArgumentsFix = (arrayFromCall, mapCall, context) => {
	if (isParenthesized(arrayFromCall, context)) {
		return;
	}

	const {sourceCode} = context;
	const arrayFromClosingParenthesis = sourceCode.getLastToken(arrayFromCall);
	const tokenBeforeArrayFromClosingParenthesis = sourceCode.getTokenBefore(arrayFromClosingParenthesis);
	const mapClosingParenthesis = sourceCode.getLastToken(mapCall);
	const tokenBeforeMapClosingParenthesis = sourceCode.getTokenBefore(mapClosingParenthesis);
	const [mapArgumentsStart] = getParenthesizedRange(mapCall.arguments[0], context);
	const insertStart = isCommaToken(tokenBeforeArrayFromClosingParenthesis)
		? sourceCode.getRange(tokenBeforeArrayFromClosingParenthesis)[0]
		: sourceCode.getRange(arrayFromClosingParenthesis)[0];
	const insertRange = [insertStart, mapArgumentsStart];

	if (wouldRemoveComments(context, insertRange)) {
		return;
	}

	return function * (fixer) {
		yield fixer.replaceTextRange(insertRange, ', ');

		if (isCommaToken(tokenBeforeMapClosingParenthesis)) {
			yield fixer.removeRange(sourceCode.getRange(tokenBeforeMapClosingParenthesis));
		}
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclaration', declaration => getLoopProblem(declaration, context));

	context.on('CallExpression', mapCall => {
		if (!(
			isMethodCall(mapCall, {
				method: 'map',
				minimumArguments: 1,
				maximumArguments: 2,
				optionalCall: false,
				optionalMember: false,
			})
			&& !hasTypeArguments(mapCall)
			&& isMethodCall(mapCall.callee.object, {
				object: 'Array',
				method: 'from',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& !hasTypeArguments(mapCall.callee.object)
			&& context.sourceCode.isGlobalReference(mapCall.callee.object.callee.object)
			&& !isFollowedByDefaultFlatCall(mapCall)
			&& isArrowFunctionWithSupportedParameters(mapCall.arguments[0])
		)) {
			return;
		}

		const arrayFromCall = mapCall.callee.object;
		const fix = getMapArgumentsFix(arrayFromCall, mapCall, context);

		const problem = {
			node: mapCall.callee.property,
			messageId: MESSAGE_ID_ERROR,
		};

		if (fix) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
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
			description: 'Prefer using the `Array.from()` mapping function argument.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
