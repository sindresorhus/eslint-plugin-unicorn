import {findVariable} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isMemberExpression} from './ast/index.js';
import {isValueNotUsable} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-location-assign';
const messages = {
	[MESSAGE_ID]: 'Prefer `Location#assign()` over assigning to `Location#href`.',
};

const hasComments = (node, sourceCode) =>
	sourceCode.getCommentsInside(node).length > 0;

const getStaticPropertyName = memberExpression => {
	const {property} = memberExpression;

	if (!memberExpression.computed && property.type === 'Identifier') {
		return property.name;
	}

	return getStaticStringValue(property);
};

const isIdentifierNamed = (node, name) =>
	node.type === 'Identifier' && node.name === name;

const getVariable = (identifier, sourceCode) =>
	findVariable(sourceCode.getScope(identifier), identifier);

const isUnshadowedGlobalIdentifier = (identifier, sourceCode) => {
	const variable = getVariable(identifier, sourceCode);
	return !variable || (variable.scope.type === 'global' && variable.defs.length === 0);
};

const isDirectLocationObject = (node, sourceCode) =>
	(
		isIdentifierNamed(node, 'location')
		&& isUnshadowedGlobalIdentifier(node, sourceCode)
	)
	|| (
		isMemberExpression(node, {
			objects: [
				'window',
				'globalThis',
			],
			property: 'location',
			computed: false,
		})
		&& isUnshadowedGlobalIdentifier(node.object, sourceCode)
	);

const getConstantInitializer = (node, sourceCode) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const definition = getVariable(node, sourceCode)?.defs[0];
	if (
		definition?.type !== 'Variable'
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	return definition.node.init;
};

const isConstantLocationAlias = (node, sourceCode) => {
	const initializer = getConstantInitializer(node, sourceCode);
	return initializer && isDirectLocationObject(initializer, sourceCode);
};

const isLocationObject = (node, sourceCode) =>
	isDirectLocationObject(node, sourceCode)
	|| isConstantLocationAlias(node, sourceCode);

const isLocationHref = (node, sourceCode) =>
	node.type === 'MemberExpression'
	&& getStaticPropertyName(node) === 'href'
	&& isLocationObject(node.object, sourceCode);

const getProblem = (node, context) => {
	const {sourceCode} = context;
	const assignmentExpression = node.parent;
	const commentsNode = assignmentExpression.parent.type === 'ExpressionStatement'
		? assignmentExpression.parent
		: assignmentExpression;
	const problem = {
		node: node.property,
		messageId: MESSAGE_ID,
	};

	if (
		assignmentExpression.operator !== '='
		|| !isValueNotUsable(assignmentExpression)
		|| !isDirectLocationObject(node.object, sourceCode)
		|| hasComments(commentsNode, sourceCode)
	) {
		return problem;
	}

	problem.fix = fixer => fixer.replaceText(
		assignmentExpression,
		`${sourceCode.getText(node.object)}.assign(${sourceCode.getText(assignmentExpression.right)})`,
	);

	return problem;
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('AssignmentExpression', assignmentExpression => {
		if (
			assignmentExpression.left.type !== 'MemberExpression'
			|| !isLocationHref(assignmentExpression.left, context.sourceCode)
		) {
			return;
		}

		return getProblem(assignmentExpression.left, context);
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `location.assign()` over assigning to `location.href`.',
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
