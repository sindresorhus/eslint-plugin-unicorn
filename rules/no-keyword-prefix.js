'use strict';

const getDocsUrl = require('./utils/get-docs-url');

const MESSAGE_ID = 'noKeywordPrefix';

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

function isInsideObjectPattern(node) {
	let current = node;

	while (current) {
		const {parent} = current;

		if (parent && parent.type === 'Property' && parent.computed && parent.key === current) {
			return false;
		}

		if (current.type === 'ObjectPattern') {
			return true;
		}

		current = parent;
	}

	return false;
}

function checkMemberExpression(report, node, options) {
	const {name} = node;
	const keyword = findKeywordPrefix(name, options);
	const effectiveParent = (node.parent.type === 'MemberExpression') ? node.parent.parent : node.parent;

	if (!options.checkProperties) {
		return;
	}

	if (node.parent.object.type === 'Identifier' && node.parent.object.name === node.name && Boolean(keyword)) {
		report(node, keyword);
	} else if (
		effectiveParent.type === 'AssignmentExpression' &&
		Boolean(keyword) &&
		(effectiveParent.right.type !== 'MemberExpression' || effectiveParent.left.type === 'MemberExpression') &&
		effectiveParent.left.property.name === node.name
	) {
		report(node, keyword);
	}
}

function checkObjectPattern(report, node, options) {
	const {name} = node;
	const keyword = findKeywordPrefix(name, options);

	if (node.parent.shorthand && node.parent.value.left && Boolean(keyword)) {
		report(node, keyword);
	}

	const assignmentKeyEqualsValue = node.parent.key.name === node.parent.value.name;

	if (Boolean(keyword) && node.parent.computed) {
		report(node, keyword);
	}

	// Prevent checking righthand side of destructured object
	if (node.parent.key === node && node.parent.value !== node) {
		return true;
	}

	const valueIsInvalid = node.parent.value.name && Boolean(keyword);

	// Ignore destructuring if the option is set, unless a new identifier is created
	if (valueIsInvalid && !(assignmentKeyEqualsValue && options.ignoreDestructuring)) {
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
		if (reported.indexOf(node) < 0) {
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
			const {name} = node;
			const keyword = findKeywordPrefix(name, options);
			const effectiveParent = (node.parent.type === 'MemberExpression') ? node.parent.parent : node.parent;

			if (node.parent.type === 'MemberExpression') {
				checkMemberExpression(report, node, options);
			} else if (node.parent.type === 'Property' || node.parent.type === 'AssignmentPattern') {
				if (node.parent.parent && node.parent.parent.type === 'ObjectPattern') {
					const finished = checkObjectPattern(report, node, options);
					if (finished) {
						return;
					}
				}

				if (!options.checkProperties || (options.ignoreDestructuring && isInsideObjectPattern(node))) {
					return;
				}

				// Don't check right hand side of AssignmentExpression to prevent duplicate warnings
				if (Boolean(keyword) && !ALLOWED_PARENT_TYPES.has(effectiveParent.type) && !(node.parent.right === node)) {
					report(node, keyword);
				}

			// Check if it's an import specifier
			} else if (['ImportSpecifier', 'ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].indexOf(node.parent.type) >= 0) {
				// Report only if the local imported identifier is invalid
				if (Boolean(keyword) && node.parent.local && node.parent.local.name === node.name) {
					report(node, keyword);
				}

			// Report anything that is invalid that isn't a CallExpression
			} else if (Boolean(keyword) && !ALLOWED_PARENT_TYPES.has(effectiveParent.type)) {
				report(node, keyword);
			}
		}
	};
};

const schema = [{
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
		checkProperties: {type: 'boolean'},
		onlyCamelCase: {type: 'boolean'}
	},
	additionalProperties: false
}];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		schema,
		messages: {
			[MESSAGE_ID]: 'Do not prefix identifiers with keyword `{{keyword}}`.'
		}
	}
};
