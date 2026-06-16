import {isNewExpression, isMethodCall} from './ast/index.js';
import {removeStatement} from './fix/index.js';
import {
	getNextNode,
	getParenthesizedText,
	getVariableIdentifiers,
	isSameIdentifier,
} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-iterable-in-constructor';
const messages = {
	[MESSAGE_ID]: 'Pass `{{source}}` directly to `new {{constructorName}}()`.',
};

const setConstructorNames = new Set([
	'Set',
	'WeakSet',
]);

const mapConstructorNames = new Set([
	'Map',
	'WeakMap',
]);

const constructorNames = [
	...setConstructorNames,
	...mapConstructorNames,
	'URLSearchParams',
];

const nonRecordIdentifierNames = new Set([
	'Infinity',
	'NaN',
	'undefined',
]);

const isEmptySupportedConstructor = node => isNewExpression(node, {
	names: constructorNames,
	argumentsLength: 0,
});

const isBlockWithOneExpressionStatement = node =>
	node.type === 'BlockStatement'
	&& node.body.length === 1
	&& node.body[0].type === 'ExpressionStatement';

const getOnlyLoopCallExpression = loop => {
	if (!isBlockWithOneExpressionStatement(loop.body)) {
		return;
	}

	const [{expression}] = loop.body.body;

	if (expression.type === 'CallExpression') {
		return expression;
	}
};

const getForOfLeftPattern = node => {
	if (
		node.type === 'VariableDeclaration'
		&& (node.kind === 'const' || node.kind === 'let')
		&& node.declarations.length === 1
	) {
		return node.declarations[0].id;
	}
};

const isIdentifierFromPattern = (pattern, argument) =>
	pattern.type === 'Identifier'
	&& isSameIdentifier(pattern, argument);

const isPairPattern = node =>
	node.type === 'ArrayPattern'
	&& node.elements.length === 2
	&& node.elements.every(element => element?.type === 'Identifier');

const isObjectEntriesCall = node => isMethodCall(node, {
	object: 'Object',
	method: 'entries',
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
});

const getSourceNode = (constructorName, loopRight) => {
	if (constructorName !== 'URLSearchParams') {
		return loopRight;
	}

	if (!isObjectEntriesCall(loopRight)) {
		return;
	}

	return loopRight.arguments[0];
};

const hasComputedObjectProperty = node =>
	node.type === 'ObjectExpression'
	&& node.properties.some(property => property.computed);

const isNonRecordIdentifier = node =>
	node.type === 'Identifier'
	&& nonRecordIdentifierNames.has(node.name);

const isDefinitelyNotRecord = node =>
	node.type === 'ArrayExpression'
	|| node.type === 'Literal'
	|| node.type === 'UnaryExpression'
	|| node.type === 'TemplateLiteral'
	|| node.type === 'NewExpression'
	|| isNonRecordIdentifier(node);

const hasUnsafeMapArrayEntry = node =>
	node.type === 'ArrayExpression'
	&& node.elements.some(element => element?.type !== 'ArrayExpression');

const isDirectlyUnsafeSource = (constructorName, sourceNode) =>
	hasComputedObjectProperty(sourceNode)
	|| (
		constructorName === 'URLSearchParams'
		&& isDefinitelyNotRecord(sourceNode)
	)
	|| (
		mapConstructorNames.has(constructorName)
		&& hasUnsafeMapArrayEntry(sourceNode)
	);

const declaresVariableNamed = (node, name, context) =>
	context.sourceCode.getDeclaredVariables(node).some(variable => variable.name === name);

const referencesVariable = (variable, node, context) => {
	const range = context.sourceCode.getRange(node);

	return getVariableIdentifiers(variable).some(identifier => {
		const [start, end] = context.sourceCode.getRange(identifier);

		return start >= range[0] && end <= range[1];
	});
};

const matchesSetLoop = (constructorName, id, loopLeft, callExpression) =>
	setConstructorNames.has(constructorName)
	&& isMethodCall(callExpression, {
		object: id.name,
		method: 'add',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& isIdentifierFromPattern(loopLeft, callExpression.arguments[0]);

const matchesMapLoop = (constructorName, id, loopLeft, callExpression) =>
	mapConstructorNames.has(constructorName)
	&& isPairPattern(loopLeft)
	&& isMethodCall(callExpression, {
		object: id.name,
		method: 'set',
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
	})
	&& isSameIdentifier(loopLeft.elements[0], callExpression.arguments[0])
	&& isSameIdentifier(loopLeft.elements[1], callExpression.arguments[1]);

const matchesUrlSearchParametersLoop = (constructorName, id, loopLeft, callExpression) =>
	constructorName === 'URLSearchParams'
	&& isPairPattern(loopLeft)
	&& isMethodCall(callExpression, {
		object: id.name,
		methods: ['append', 'set'],
		argumentsLength: 2,
		optionalCall: false,
		optionalMember: false,
	})
	&& isSameIdentifier(loopLeft.elements[0], callExpression.arguments[0])
	&& isSameIdentifier(loopLeft.elements[1], callExpression.arguments[1]);

const getConstructorReplacementText = (newExpression, sourceNode, context) => {
	const {sourceCode} = context;
	const [start] = sourceCode.getRange(newExpression);
	const constructorTextEnd = sourceCode.getRange(newExpression.typeArguments ?? newExpression.callee)[1];
	const constructorText = sourceCode.text.slice(start, constructorTextEnd).trimEnd();
	const sourceText = getParenthesizedText(sourceNode, context);

	return `${constructorText}(${sourceText})`;
};

const hasNoCommentsInRange = (context, range) =>
	!context.sourceCode.getAllComments().some(comment => {
		const [start, end] = context.sourceCode.getRange(comment);

		return start >= range[0] && end <= range[1];
	});

const getFix = (problem, context) => {
	const {
		loop,
		newExpression,
		sourceNode,
	} = problem;

	return function * (fixer) {
		yield fixer.replaceText(newExpression, getConstructorReplacementText(newExpression, sourceNode, context));
		yield removeStatement(loop, context, fixer);
	};
};

const getLoopProblem = (declaration, context) => {
	if (
		declaration.declarations.length !== 1
		|| declaration.declarations[0].id.type !== 'Identifier'
		|| !isEmptySupportedConstructor(declaration.declarations[0].init)
	) {
		return;
	}

	const [declarator] = declaration.declarations;
	const {id, init: newExpression} = declarator;
	const loop = getNextNode(declaration, context);

	if (loop?.type !== 'ForOfStatement' || loop.await) {
		return;
	}

	const callExpression = getOnlyLoopCallExpression(loop);
	if (!callExpression) {
		return;
	}

	const constructorName = newExpression.callee.name;
	const sourceNode = getSourceNode(constructorName, loop.right);
	if (!sourceNode) {
		return;
	}

	const loopLeft = getForOfLeftPattern(loop.left);
	if (!loopLeft) {
		return;
	}

	if (declaresVariableNamed(loop.left, id.name, context)) {
		return;
	}

	if (isDirectlyUnsafeSource(constructorName, sourceNode)) {
		return;
	}

	const variable = context.sourceCode.getDeclaredVariables(declarator)[0];
	if (
		variable
		&& referencesVariable(variable, loop.right, context)
	) {
		return;
	}

	if (!(
		matchesSetLoop(constructorName, id, loopLeft, callExpression)
		|| matchesMapLoop(constructorName, id, loopLeft, callExpression)
		|| matchesUrlSearchParametersLoop(constructorName, id, loopLeft, callExpression)
	)) {
		return;
	}

	if (!hasNoCommentsInRange(context, [
		context.sourceCode.getRange(declaration)[0],
		context.sourceCode.getRange(loop)[1],
	])) {
		return;
	}

	return {
		node: loop,
		messageId: MESSAGE_ID,
		data: {
			constructorName,
			source: context.sourceCode.getText(sourceNode),
		},
		fix: getFix({
			loop,
			newExpression,
			sourceNode,
		}, context),
	};
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclaration', declaration => getLoopProblem(declaration, context));

	context.on('NewExpression', newExpression => {
		if (
			!isNewExpression(newExpression, {
				name: 'URLSearchParams',
				argumentsLength: 1,
			})
			|| !isObjectEntriesCall(newExpression.arguments[0])
		) {
			return;
		}

		const objectEntriesCall = newExpression.arguments[0];
		const [sourceNode] = objectEntriesCall.arguments;
		if (
			context.sourceCode.getCommentsInside(objectEntriesCall).length > 0
			|| isDirectlyUnsafeSource('URLSearchParams', sourceNode)
		) {
			return;
		}

		return {
			node: objectEntriesCall.callee,
			messageId: MESSAGE_ID,
			data: {
				constructorName: 'URLSearchParams',
				source: context.sourceCode.getText(sourceNode),
			},
			fix: fixer => fixer.replaceText(objectEntriesCall, getParenthesizedText(sourceNode, context)),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer passing iterables directly to constructors instead of filling empty collections.',
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
