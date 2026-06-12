import {findVariable} from '@eslint-community/eslint-utils';
import {isMemberExpression} from './ast/index.js';
import {isValueNotUsable} from './utils/index.js';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';

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

	if (property.type === 'Literal' && typeof property.value === 'string') {
		return property.value;
	}

	if (property.type === 'TemplateLiteral' && property.expressions.length === 0) {
		return property.quasis[0].value.cooked;
	}
};

const isIdentifierNamed = (node, name) =>
	node.type === 'Identifier' && node.name === name;

const isUnshadowedGlobalIdentifier = (identifier, sourceCode) => {
	const variable = findVariable(sourceCode.getScope(identifier), identifier);
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

const isDirectLocationHref = (node, sourceCode) =>
	node.type === 'MemberExpression'
	&& getStaticPropertyName(node) === 'href'
	&& isDirectLocationObject(node.object, sourceCode);

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

const tracker = new GlobalReferenceTracker({
	object: 'location.href',
	filter: ({node}) => node.parent.type === 'AssignmentExpression' && node.parent.left === node,
	handle({node}, context) {
		if (isDirectLocationHref(node, context.sourceCode)) {
			return;
		}

		return getProblem(node, context);
	},
});

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('AssignmentExpression', assignmentExpression => {
		if (
			assignmentExpression.left.type !== 'MemberExpression'
			|| !isDirectLocationHref(assignmentExpression.left, context.sourceCode)
		) {
			return;
		}

		return getProblem(assignmentExpression.left, context);
	});

	tracker.listen({context});
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
