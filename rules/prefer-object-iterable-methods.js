import {findVariable, hasSideEffect} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	getAvailableVariableName,
	getScopes,
	isLeftHandSide,
	isSameReference,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-object-iterable-methods';
const messages = {
	[MESSAGE_ID]: 'Prefer `Object.{{preferredMethod}}()` over `Object.{{currentMethod}}()`.',
};

const functionTypes = new Set([
	'ArrowFunctionExpression',
	'FunctionDeclaration',
	'FunctionExpression',
]);

const classTypes = new Set([
	'ClassDeclaration',
	'ClassExpression',
]);

const isObjectMethodCall = (node, method) => isMethodCall(node, {
	object: 'Object',
	method,
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
});

const isSupportedCallback = node =>
	(
		node.type === 'ArrowFunctionExpression'
		|| node.type === 'FunctionExpression'
	)
	&& !node.async
	&& !node.generator
	&& node.params.length === 1;

const getForOfPattern = node => {
	if (
		node.type === 'VariableDeclaration'
		&& (node.kind === 'const' || node.kind === 'let')
		&& node.declarations.length === 1
	) {
		return node.declarations[0].id;
	}
};

const isInsideNode = (node, parentNode, sourceCode) => {
	const [start, end] = sourceCode.getRange(node);
	const [parentStart, parentEnd] = sourceCode.getRange(parentNode);

	return start >= parentStart && end <= parentEnd;
};

const isBeforeNode = (node, targetNode, sourceCode) => {
	const [, end] = sourceCode.getRange(node);
	const [targetStart] = sourceCode.getRange(targetNode);

	return end <= targetStart;
};

function * traverse(node, visitorKeys, root = node) {
	yield node;

	if (
		node !== root
		&& (functionTypes.has(node.type) || classTypes.has(node.type))
	) {
		return;
	}

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const child of value) {
				if (child?.type) {
					yield * traverse(child, visitorKeys, root);
				}
			}
		} else if (value?.type) {
			yield * traverse(value, visitorKeys, root);
		}
	}
}

const getVariable = (identifier, context) => findVariable(context.sourceCode.getScope(identifier), identifier);

const getVariableReferencesInNode = (variable, node, context) =>
	variable.references.filter(reference => isInsideNode(reference.identifier, node, context.sourceCode));

const isWriteReference = reference => !reference.init && reference.isWrite();

const isMutationTarget = node => {
	const {parent} = node;

	return (
		isLeftHandSide(node)
		|| (parent.type === 'CallExpression' && parent.callee === node)
	);
};

const unwrapReference = node => {
	if (
		[
			'ChainExpression',
			'TSAsExpression',
			'TSSatisfiesExpression',
			'TSTypeAssertion',
			'TSNonNullExpression',
		].includes(node.type)
	) {
		return unwrapReference(node.expression);
	}

	return node;
};

const isSameScopedReference = (left, right, context) => {
	left = unwrapReference(left);
	right = unwrapReference(right);

	if (left.type === 'Identifier' && right.type === 'Identifier') {
		return left.name === right.name && getVariable(left, context) === getVariable(right, context);
	}

	if (left.type === 'MemberExpression' && right.type === 'MemberExpression') {
		if (
			!isSameReference(left, right)
			|| !isSameScopedReference(left.object, right.object, context)
		) {
			return false;
		}

		return !left.computed || isSameScopedReference(left.property, right.property, context);
	}

	return isSameReference(left, right);
};

const isSameVariableIdentifier = (node, variable, context) =>
	node.type === 'Identifier'
	&& getVariable(node, context) === variable;

const hasObjectWrite = ({targetNode, objectNode, context}) => {
	const objectVariable = unwrapReference(objectNode).type === 'Identifier'
		? getVariable(unwrapReference(objectNode), context)
		: undefined;

	if (
		objectVariable
		&& getVariableReferencesInNode(objectVariable, targetNode, context).some(reference => isWriteReference(reference))
	) {
		return true;
	}

	for (const node of traverse(targetNode, context.sourceCode.visitorKeys)) {
		if (
			node.type === 'MemberExpression'
			&& isLeftHandSide(node)
			&& isSameScopedReference(node.object, objectNode, context)
		) {
			return true;
		}
	}

	return false;
};

const getDirectValueMembers = ({targetNode, objectNode, keyVariable, context}) => {
	const valueMembers = [];

	for (const node of traverse(targetNode, context.sourceCode.visitorKeys)) {
		if (
			node.type !== 'MemberExpression'
			|| !node.computed
			|| node.optional
			|| !isSameScopedReference(node.object, objectNode, context)
			|| !isSameVariableIdentifier(node.property, keyVariable, context)
		) {
			continue;
		}

		if (isMutationTarget(node)) {
			return;
		}

		valueMembers.push(node);
	}

	return valueMembers;
};

const hasCommentsInside = (nodes, sourceCode) =>
	nodes.some(node => sourceCode.getCommentsInside(node).length > 0);

const hasSideEffectBeforeValueRead = ({targetNode, valueMembers, context}) => {
	const {sourceCode} = context;

	for (const valueMember of valueMembers) {
		for (const node of traverse(targetNode, sourceCode.visitorKeys)) {
			if (
				isBeforeNode(node, valueMember, sourceCode)
				&& hasSideEffect(node, sourceCode)
			) {
				return true;
			}
		}
	}

	return false;
};

const isArrowParameterParenthesized = (parameter, context) => {
	const {sourceCode} = context;
	const {parent} = parameter;

	if (parent.type !== 'ArrowFunctionExpression') {
		return true;
	}

	const previousToken = sourceCode.getTokenBefore(parameter);
	const nextToken = sourceCode.getTokenAfter(parameter);

	return previousToken?.value === '(' && nextToken?.value === ')';
};

const getReplacementBindingText = (binding, text, context, {needsParentheses = false} = {}) =>
	needsParentheses && !isArrowParameterParenthesized(binding, context) ? `(${text})` : text;

const getAvailableName = (name, binding, context) =>
	getAvailableVariableName(name, getScopes(context.sourceCode.getScope(binding)));

const getFix = problem => fixer => {
	const {
		context,
		methodProperty,
		preferredMethod,
		binding,
		bindingReplacement,
		valueMembers,
		valueName,
	} = problem;
	const {sourceCode} = context;

	if (hasCommentsInside([binding, ...valueMembers], sourceCode)) {
		return;
	}

	return [
		fixer.replaceText(methodProperty, preferredMethod),
		fixer.replaceText(binding, bindingReplacement),
		...valueMembers.map(node => fixer.replaceText(node, valueName)),
	];
};

const createProblem = problem => {
	const {
		context,
		methodCall,
		currentMethod,
		preferredMethod,
		binding,
		valueMembers = [],
		valueName,
	} = problem;
	const {sourceCode} = context;
	const problemObject = {
		node: methodCall.callee.property,
		messageId: MESSAGE_ID,
		data: {
			currentMethod,
			preferredMethod,
		},
	};

	if (
		valueName
		&& problem.canFix !== false
		&& !hasCommentsInside([binding, ...valueMembers], sourceCode)
	) {
		problemObject.fix = getFix(problem);
	} else if (
		!valueName
		&& problem.canFix !== false
		&& !hasCommentsInside([binding], sourceCode)
	) {
		problemObject.fix = fixer => [
			fixer.replaceText(methodCall.callee.property, preferredMethod),
			fixer.replaceText(binding, problem.bindingReplacement),
		];
	}

	return problemObject;
};

const getObjectKeysProblem = ({methodCall, binding, targetNode, context}) => {
	if (binding.type !== 'Identifier' || binding.typeAnnotation) {
		return;
	}

	const keyVariable = getVariable(binding, context);
	if (!keyVariable) {
		return;
	}

	const references = getVariableReferencesInNode(keyVariable, targetNode, context);
	if (references.some(reference => isWriteReference(reference))) {
		return;
	}

	const [objectNode] = methodCall.arguments;
	if (hasObjectWrite({targetNode, objectNode, context})) {
		return;
	}

	const valueMembers = getDirectValueMembers({
		targetNode,
		objectNode,
		keyVariable,
		context,
	});
	if (!valueMembers || valueMembers.length === 0) {
		return;
	}

	const valueMemberProperties = new Set(valueMembers.map(node => node.property));
	const keyReferences = references.filter(reference => !valueMemberProperties.has(reference.identifier));
	const valueName = getAvailableName('value', binding, context);
	if (!valueName) {
		return;
	}

	const preferredMethod = keyReferences.length === 0 ? 'values' : 'entries';
	const keyName = binding.name;
	const bindingReplacement = preferredMethod === 'values'
		? getReplacementBindingText(binding, valueName, context)
		: getReplacementBindingText(binding, `[${keyName}, ${valueName}]`, context, {needsParentheses: true});

	return createProblem({
		context,
		methodCall,
		methodProperty: methodCall.callee.property,
		currentMethod: 'keys',
		preferredMethod,
		binding,
		bindingReplacement,
		valueMembers,
		valueName,
		canFix: !hasSideEffectBeforeValueRead({
			targetNode,
			valueMembers,
			context,
		}),
	});
};

const getPreferredObjectEntriesMethod = (keyReferences, valueReferences) => {
	if (keyReferences.length === valueReferences.length) {
		return;
	}

	if (keyReferences.length > 0 && valueReferences.length > 0) {
		return;
	}

	return keyReferences.length === 0 ? 'values' : 'keys';
};

const getObjectEntriesProblem = ({methodCall, binding, targetNode, context}) => {
	if (
		binding.type !== 'ArrayPattern'
		|| binding.elements.length > 2
		|| binding.elements[0]?.type !== 'Identifier'
		|| (binding.elements[1] && binding.elements[1].type !== 'Identifier')
	) {
		return;
	}

	const [keyBinding, valueBinding] = binding.elements;
	if (keyBinding.typeAnnotation || valueBinding?.typeAnnotation) {
		return;
	}

	const keyVariable = getVariable(keyBinding, context);
	if (!keyVariable) {
		return;
	}

	const keyReferences = getVariableReferencesInNode(keyVariable, targetNode, context);
	if (
		keyReferences.some(reference => isWriteReference(reference))
	) {
		return;
	}

	let valueReferences = [];
	if (valueBinding) {
		const valueVariable = getVariable(valueBinding, context);
		if (!valueVariable) {
			return;
		}

		valueReferences = getVariableReferencesInNode(valueVariable, targetNode, context);
		if (valueReferences.some(reference => isWriteReference(reference))) {
			return;
		}
	}

	const preferredMethod = getPreferredObjectEntriesMethod(keyReferences, valueReferences);
	if (!preferredMethod) {
		return;
	}

	const bindingReplacement = preferredMethod === 'values'
		? getReplacementBindingText(binding, valueBinding.name, context)
		: getReplacementBindingText(binding, keyBinding.name, context);

	return createProblem({
		context,
		methodCall,
		methodProperty: methodCall.callee.property,
		currentMethod: 'entries',
		preferredMethod,
		binding,
		bindingReplacement,
	});
};

const getObjectMethodProblem = (methodCall, binding, targetNode, context) => {
	if (isObjectMethodCall(methodCall, 'keys')) {
		return getObjectKeysProblem({
			methodCall,
			binding,
			targetNode,
			context,
		});
	}

	if (isObjectMethodCall(methodCall, 'entries')) {
		return getObjectEntriesProblem({
			methodCall,
			binding,
			targetNode,
			context,
		});
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ForOfStatement', node => {
		if (node.await) {
			return;
		}

		const binding = getForOfPattern(node.left);
		if (!binding) {
			return;
		}

		return getObjectMethodProblem(node.right, binding, node.body, context);
	});

	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'map',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [callback] = node.arguments;
		if (!isSupportedCallback(callback)) {
			return;
		}

		if (functionTypes.has(callback.body.type) || classTypes.has(callback.body.type)) {
			return;
		}

		return getObjectMethodProblem(node.callee.object, callback.params[0], callback.body, context);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer the most specific `Object` iterable method.',
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
