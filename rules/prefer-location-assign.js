import {isIdentifierNamed, isMemberExpression} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	getConstVariableInitializer,
	getParenthesizedRange,
	getParenthesizedText,
	getStaticPropertyName,
	isGlobalIdentifier,
	isValueNotUsable,
	wouldRemoveComments,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-location-assign';
const messages = {
	[MESSAGE_ID]: 'Prefer `Location#assign()` over assigning to `Location#href`.',
};

const isDirectLocationObject = (node, context) =>
	(
		isIdentifierNamed(node, 'location')
		&& isGlobalIdentifier(node, context)
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
		&& isGlobalIdentifier(node.object, context)
	);

const isConstantLocationAlias = (node, context) => {
	const initializer = getConstVariableInitializer(node, context);
	return initializer && isDirectLocationObject(initializer, context);
};

const isLocationObject = (node, context) =>
	isDirectLocationObject(node, context)
	|| isConstantLocationAlias(node, context);

const isLocationHref = (node, context) =>
	node.type === 'MemberExpression'
	&& getStaticPropertyName(node, context) === 'href'
	&& isLocationObject(node.object, context);

const getProblem = (node, context) => {
	const {sourceCode} = context;
	const assignmentExpression = node.parent;
	const problem = {
		node: node.property,
		messageId: MESSAGE_ID,
	};

	if (
		assignmentExpression.operator !== '='
		|| !isValueNotUsable(assignmentExpression)
		|| !isDirectLocationObject(node.object, context)
		|| wouldRemoveComments(context, assignmentExpression, [node.object, getParenthesizedRange(assignmentExpression.right, context)])
	) {
		return problem;
	}

	problem.fix = function * (fixer) {
		yield fixer.replaceText(
			assignmentExpression,
			`${sourceCode.getText(node.object)}.assign(${getParenthesizedText(assignmentExpression.right, context)})`,
		);
		yield fixSpaceAroundKeyword(fixer, assignmentExpression, context);
	};

	return problem;
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on('AssignmentExpression', assignmentExpression => {
		if (
			assignmentExpression.left.type !== 'MemberExpression'
			|| !isLocationHref(assignmentExpression.left, context)
		) {
			return;
		}

		return getProblem(assignmentExpression.left, context);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
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
