'use strict';

const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'noKeywordPrefix';
const messages = {
	[MESSAGE_ID]: 'Do not prefix identifiers with keyword `{{keyword}}`.'
};

const prepareOptions = ({
	blacklist,
	checkProperties = true,
	onlyCamelCase = true
} = {}) => {
	return {
		blacklist: (blacklist || [
			'new',
			'class'
		]),
		checkProperties,
		onlyCamelCase
	};
};

function findKeywordPrefix(name, options) {
	return options.blacklist.find(keyword => {
		const suffix = options.onlyCamelCase ? '[A-Z]' : '.';
		const regex = new RegExp(`^${keyword}${suffix}`);
		return name.match(regex);
	});
}

function checkMemberExpression(report, node, options) {
	const {name, parent} = node;
	const keyword = findKeywordPrefix(name, options);
	const effectiveParent = (parent.type === 'MemberExpression') ? parent.parent : parent;

	if (!options.checkProperties) {
		return;
	}

	if (parent.object.type === 'Identifier' && parent.object.name === name && Boolean(keyword)) {
		report(node, keyword);
	} else if (
		effectiveParent.type === 'AssignmentExpression' &&
		Boolean(keyword) &&
		(effectiveParent.right.type !== 'MemberExpression' || effectiveParent.left.type === 'MemberExpression') &&
		effectiveParent.left.property.name === name
	) {
		report(node, keyword);
	}
}

function checkObjectPattern(report, node, options) {
	const {name, parent} = node;
	const keyword = findKeywordPrefix(name, options);

	/* istanbul ignore next: Can't find a case to cover this line */
	if (parent.shorthand && parent.value.left && Boolean(keyword)) {
		report(node, keyword);
	}

	const assignmentKeyEqualsValue = parent.key.name === parent.value.name;

	if (Boolean(keyword) && parent.computed) {
		report(node, keyword);
	}

	// Prevent checking righthand side of destructured object
	if (parent.key === node && parent.value !== node) {
		return true;
	}

	const valueIsInvalid = parent.value.name && Boolean(keyword);

	// Ignore destructuring if the option is set, unless a new identifier is created
	if (valueIsInvalid && !assignmentKeyEqualsValue) {
		report(node, keyword);
	}

	return false;
}

// Core logic copied from:
// https://github.com/eslint/eslint/blob/master/lib/rules/camelcase.js
const create = context => {
	const options = prepareOptions(context.options[0]);

	// Contains reported nodes to avoid reporting twice on destructuring with shorthand notation
	const reported = [];
	const ALLOWED_PARENT_TYPES = new Set(['CallExpression', 'NewExpression']);

	function report(node, keyword) {
		if (!reported.includes(node)) {
			reported.push(node);
			context.report({
				node,
				messageId: MESSAGE_ID,
				data: {
					name: node.name,
					keyword
				}
			});
		}
	}

	return {
		Identifier: node => {
			const {name, parent} = node;
			const keyword = findKeywordPrefix(name, options);
			const effectiveParent = (parent.type === 'MemberExpression') ? parent.parent : parent;

			if (parent.type === 'MemberExpression') {
				checkMemberExpression(report, node, options);
			} else if (
				parent.type === 'Property' ||
				parent.type === 'AssignmentPattern'
			) {
				if (parent.parent && parent.parent.type === 'ObjectPattern') {
					const finished = checkObjectPattern(report, node, options);
					if (finished) {
						return;
					}
				}

				if (
					!options.checkProperties
				) {
					return;
				}

				// Don't check right hand side of AssignmentExpression to prevent duplicate warnings
				if (
					Boolean(keyword) &&
					!ALLOWED_PARENT_TYPES.has(effectiveParent.type) &&
					!(parent.right === node)
				) {
					report(node, keyword);
				}

			// Check if it's an import specifier
			} else if (
				[
					'ImportSpecifier',
					'ImportNamespaceSpecifier',
					'ImportDefaultSpecifier'
				].includes(parent.type)
			) {
				// Report only if the local imported identifier is invalid
				if (
					Boolean(keyword) &&
					parent.local &&
					parent.local.name === name
				) {
					report(node, keyword);
				}

			// Report anything that is invalid that isn't a CallExpression
			} else if (
				Boolean(keyword) &&
				!ALLOWED_PARENT_TYPES.has(effectiveParent.type)
			) {
				report(node, keyword);
			}
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			blacklist: {
				type: 'array',
				items: [
					{
						type: 'string'
					}
				],
				minItems: 0,
				uniqueItems: true
			},
			checkProperties: {
				type: 'boolean'
			},
			onlyCamelCase: {
				type: 'boolean'
			}
		},
		additionalProperties: false
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		schema,
		messages
	}
};
