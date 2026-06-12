import {findVariable} from '@eslint-community/eslint-utils';
import {isReferenceIdentifier} from './ast/index.js';

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

		if (
			parent.type === 'PropertyDefinition'
			|| parent.type === 'AccessorProperty'
			|| parent.type === 'StaticBlock'
			|| parent.type === 'ClassBody'
		) {
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

const isAssignmentTarget = node =>
	(
		node.parent.type === 'AssignmentExpression'
		&& node.parent.left === node
	)
	|| (
		node.parent.type === 'UpdateExpression'
		&& node.parent.argument === node
	)
	|| (
		node.parent.type === 'UnaryExpression'
		&& node.parent.operator === 'delete'
		&& node.parent.argument === node
	);

const isSimpleMemberAccess = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& !node.parent.optional
	&& !isAssignmentTarget(node.parent);

const isInsideAssignmentTargetMember = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& isAssignmentTarget(node.parent);

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
		if (preferThis || isInsideAssignmentTargetMember(node)) {
			return;
		}

		const staticMethod = getStaticMethod(node);
		if (!staticMethod) {
			return;
		}

		const classReferenceNode = getClassReferenceNode(getClass(staticMethod));
		if (!classReferenceNode) {
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
		if (preferSuper || isInsideAssignmentTargetMember(node)) {
			return;
		}

		const staticMethod = getStaticMethod(node);
		if (!staticMethod) {
			return;
		}

		const superClassReferenceNode = getSimpleSuperClassReferenceNode(getClass(staticMethod));
		if (!superClassReferenceNode) {
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
			|| isInsideAssignmentTargetMember(node)
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

		if (!preferSuper || !isSimpleMemberAccess(node)) {
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
