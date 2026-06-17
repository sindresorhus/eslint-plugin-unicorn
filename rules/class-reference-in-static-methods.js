import {findVariable} from '@eslint-community/eslint-utils';
import {isReferenceIdentifier} from './ast/index.js';
import {isParenthesized} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_THIS = 'this';
const MESSAGE_ID_CLASS = 'class';
const MESSAGE_ID_CLASS_UNAVAILABLE = 'class-unavailable';
const MESSAGE_ID_SUPER = 'super';
const MESSAGE_ID_SUPER_CLASS = 'super-class';
const MESSAGE_ID_SUPER_CLASS_UNAVAILABLE = 'super-class-unavailable';
const SUGGESTION_MESSAGE_ID = 'suggestion';

const STATIC_METHOD_BOUNDARY_TYPES = new Set([
	'PropertyDefinition',
	'AccessorProperty',
	'StaticBlock',
	'ClassBody',
]);

const TYPESCRIPT_EXPRESSION_WRAPPER_TYPES = new Set([
	'TSAsExpression',
	'TSInstantiationExpression',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
]);

const messages = {
	[MESSAGE_ID_THIS]: 'Use `this` instead of `{{name}}` in static methods.',
	[MESSAGE_ID_CLASS]: 'Use `{{name}}` instead of `this` in static methods.',
	[MESSAGE_ID_CLASS_UNAVAILABLE]: 'Use the class name instead of `this` in static methods.',
	[MESSAGE_ID_SUPER]: 'Use `super` instead of `{{name}}` in static methods.',
	[MESSAGE_ID_SUPER_CLASS]: 'Use `{{name}}` instead of `super` in static methods.',
	[MESSAGE_ID_SUPER_CLASS_UNAVAILABLE]: 'Use the superclass name instead of `super` in static methods.',
	[SUGGESTION_MESSAGE_ID]: 'Replace `{{source}}` with `{{replacement}}`.',
};

const isMethodValue = node =>
	node.parent.type === 'MethodDefinition'
	&& node.parent.value === node;

const isNonArrowFunction = node =>
	node.type === 'FunctionDeclaration'
	|| node.type === 'FunctionExpression';

const getStaticMethod = node => {
	let child = node;

	for (let {parent} = node; parent; child = parent, parent = parent.parent) {
		if (parent.type === 'ArrowFunctionExpression') {
			continue;
		}

		if (isNonArrowFunction(parent) && !isMethodValue(parent)) {
			return;
		}

		if (parent.type === 'MethodDefinition') {
			return parent.static && parent.value === child ? parent : undefined;
		}

		if (STATIC_METHOD_BOUNDARY_TYPES.has(parent.type)) {
			return;
		}
	}
};

const getClass = staticMethod => staticMethod.parent.parent;

const getClassReferenceNode = classNode => {
	if (classNode.id) {
		return classNode.id;
	}

	const {parent} = classNode;
	if (
		classNode.type === 'ClassExpression'
		&& parent.type === 'VariableDeclarator'
		&& parent.init === classNode
		&& parent.id.type === 'Identifier'
	) {
		return parent.id;
	}
};

const isSameVariable = (sourceCode, reference, binding) =>
	findVariable(sourceCode.getScope(reference), reference)
	=== findVariable(sourceCode.getScope(binding), binding);

// Whether the class/superclass name resolves to the class binding at `node`'s location.
// If it's shadowed by a local variable, the name can't be used to reference the class.
const isReferenceNameAvailable = (sourceCode, node, referenceNode) =>
	findVariable(sourceCode.getScope(node), referenceNode.name)
	=== findVariable(sourceCode.getScope(referenceNode), referenceNode);

const isAssignmentTargetRoot = (parent, node) =>
	(
		parent.type === 'AssignmentExpression'
		&& parent.left === node
	)
	|| (
		parent.type === 'UpdateExpression'
		&& parent.argument === node
	)
	|| (
		parent.type === 'UnaryExpression'
		&& parent.operator === 'delete'
		&& parent.argument === node
	)
	|| (
		(
			parent.type === 'ForInStatement'
			|| parent.type === 'ForOfStatement'
		)
		&& parent.left === node
	);

const isTypeScriptExpressionWrapper = (parent, node) =>
	TYPESCRIPT_EXPRESSION_WRAPPER_TYPES.has(parent.type)
	&& parent.expression === node;

const getTypeScriptExpressionWrapper = node => isTypeScriptExpressionWrapper(node.parent, node) ? node.parent : undefined;

const getAssignmentTargetAncestor = node => {
	const {parent} = node;

	if (parent.type === 'MemberExpression' && parent.object === node) {
		return parent;
	}

	if (parent.type === 'ChainExpression' && parent.expression === node) {
		return parent;
	}

	const typeScriptExpressionWrapper = getTypeScriptExpressionWrapper(node);
	if (typeScriptExpressionWrapper) {
		return typeScriptExpressionWrapper;
	}

	if (
		parent.type === 'Property'
		&& parent.value === node
		&& parent.parent.type === 'ObjectPattern'
	) {
		return parent.parent;
	}

	if (parent.type === 'ObjectPattern' && parent.properties.includes(node)) {
		return parent;
	}

	if (parent.type === 'ArrayPattern' && parent.elements.includes(node)) {
		return parent;
	}

	if (parent.type === 'AssignmentPattern' && parent.left === node) {
		return parent;
	}

	if (parent.type === 'RestElement' && parent.argument === node) {
		return parent;
	}
};

const isAssignmentTarget = node => {
	let current = node;

	while (current.parent) {
		if (isAssignmentTargetRoot(current.parent, current)) {
			return true;
		}

		const ancestor = getAssignmentTargetAncestor(current);
		if (!ancestor) {
			return false;
		}

		current = ancestor;
	}

	return false;
};

const isMemberExpressionObject = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node;

const isSimpleMemberAccess = node =>
	isMemberExpressionObject(node)
	&& !node.parent.optional
	&& !isAssignmentTarget(node.parent);

const getNodeWithTypeScriptExpressionWrappers = node => {
	let current = node;

	while (current.parent) {
		const typeScriptExpressionWrapper = getTypeScriptExpressionWrapper(current);
		if (!typeScriptExpressionWrapper) {
			return current;
		}

		current = typeScriptExpressionWrapper;
	}

	return current;
};

const isDirectCallee = node => {
	const current = getNodeWithTypeScriptExpressionWrappers(node);

	return (
		current.parent.type === 'CallExpression'
		&& current.parent.callee === current
	)
	|| (
		current.parent.type === 'NewExpression'
		&& current.parent.callee === current
	)
	|| (
		current.parent.type === 'TaggedTemplateExpression'
		&& current.parent.tag === current
	);
};

const isPrivateMemberAccess = node => {
	const current = getNodeWithTypeScriptExpressionWrappers(node);

	return isMemberExpressionObject(current)
		&& current.parent.property.type === 'PrivateIdentifier';
};

const isPrivateBrandCheck = node => {
	const current = getNodeWithTypeScriptExpressionWrappers(node);

	return current.parent.type === 'BinaryExpression'
		&& current.parent.operator === 'in'
		&& current.parent.left.type === 'PrivateIdentifier'
		&& current.parent.right === current;
};

const isTypeScriptTypeIdentifier = node => {
	let current = node;

	while (current.parent.type === 'TSQualifiedName') {
		current = current.parent;
	}

	return (
		current.parent.type === 'TSTypeReference'
		&& current.parent.typeName === current
	)
	|| (
		current.parent.type === 'TSTypeQuery'
		&& current.parent.exprName === current
	);
};

const getSimpleSuperClassReferenceNode = classNode => classNode.superClass?.type === 'Identifier' ? classNode.superClass : undefined;

const getReplacementRangeNode = node => node.parent.type === 'ChainExpression' ? node.parent : node;

/**
@param {ESTree.Node} node
@param {string} replacement
@returns {ESLint.Rule.ReportFixer}
*/
const replaceNodeSuggestion = (node, replacement) => fixer => fixer.replaceText(getReplacementRangeNode(node), replacement);

/**
@param {ESTree.Node} node
@param {string} messageId
@param {string} source
@param {string} replacement
@param {string} name
@returns {ESLint.Rule.ReportDescriptor}
*/
const problemWithSuggestion = ({node, messageId, source, replacement, name}) => ({
	node,
	messageId,
	data: {name},
	suggest: [
		{
			messageId: SUGGESTION_MESSAGE_ID,
			data: {source, replacement},
			fix: replaceNodeSuggestion(node, replacement),
		},
	],
});

const problemWithoutSuggestion = (node, messageId, name) => ({
	node,
	messageId,
	data: {name},
});

const schema = [
	{
		type: 'object',
		properties: {
			preferThis: {
				type: 'boolean',
				description: 'Prefer `this` over the current class name in static methods.',
			},
			preferSuper: {
				type: 'boolean',
				description: 'Prefer `super` over the superclass name in static methods.',
			},
		},
		additionalProperties: false,
	},
];

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {preferThis, preferSuper} = context.options[0];

	context.on('ThisExpression', node => {
		if (
			preferThis
			|| isAssignmentTarget(node)
			|| isDirectCallee(node)
			|| isPrivateMemberAccess(node)
			|| isPrivateBrandCheck(node)
		) {
			return;
		}

		const staticMethod = getStaticMethod(node);
		if (!staticMethod) {
			return;
		}

		const classReferenceNode = getClassReferenceNode(getClass(staticMethod));
		if (
			!classReferenceNode
			|| !isReferenceNameAvailable(sourceCode, node, classReferenceNode)
		) {
			return problemWithoutSuggestion(node, MESSAGE_ID_CLASS_UNAVAILABLE);
		}

		return problemWithSuggestion({
			node,
			messageId: MESSAGE_ID_CLASS,
			source: 'this',
			replacement: classReferenceNode.name,
			name: classReferenceNode.name,
		});
	});

	context.on('Super', node => {
		if (preferSuper || isAssignmentTarget(node)) {
			return;
		}

		const staticMethod = getStaticMethod(node);
		if (!staticMethod) {
			return;
		}

		const superClassReferenceNode = getSimpleSuperClassReferenceNode(getClass(staticMethod));
		if (
			!superClassReferenceNode
			|| !isReferenceNameAvailable(sourceCode, node, superClassReferenceNode)
		) {
			return problemWithoutSuggestion(node, MESSAGE_ID_SUPER_CLASS_UNAVAILABLE);
		}

		return problemWithSuggestion({
			node,
			messageId: MESSAGE_ID_SUPER_CLASS,
			source: 'super',
			replacement: superClassReferenceNode.name,
			name: superClassReferenceNode.name,
		});
	});

	context.on('Identifier', node => {
		if (
			!isReferenceIdentifier(node)
			|| isTypeScriptTypeIdentifier(node)
			|| isAssignmentTarget(node)
			|| isDirectCallee(node)
			|| isPrivateMemberAccess(node)
			|| isPrivateBrandCheck(node)
		) {
			return;
		}

		const staticMethod = getStaticMethod(node);
		if (!staticMethod) {
			return;
		}

		const classNode = getClass(staticMethod);

		if (preferThis) {
			const classReferenceNode = getClassReferenceNode(classNode);
			if (
				classReferenceNode
				&& node.name === classReferenceNode.name
				&& isSameVariable(sourceCode, node, classReferenceNode)
			) {
				return problemWithSuggestion({
					node,
					messageId: MESSAGE_ID_THIS,
					source: node.name,
					replacement: 'this',
					name: node.name,
				});
			}
		}

		if (
			!preferSuper
			|| !isSimpleMemberAccess(node)
			|| isParenthesized(node, context)
		) {
			return;
		}

		const superClassReferenceNode = getSimpleSuperClassReferenceNode(classNode);
		if (
			superClassReferenceNode
			&& node.name === superClassReferenceNode.name
			&& isSameVariable(sourceCode, node, superClassReferenceNode)
		) {
			return problemWithSuggestion({
				node,
				messageId: MESSAGE_ID_SUPER,
				source: node.name,
				replacement: 'super',
				name: node.name,
			});
		}
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent class references in static methods.',
			recommended: true,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{preferThis: true, preferSuper: true}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
