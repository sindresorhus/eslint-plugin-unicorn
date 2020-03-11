'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const quoteString = require('./utils/quote-string');
const replaceTemplateElement = require('./utils/replace-template-element');
const escapeTemplateElementRaw = require('./utils/escape-template-element-raw');

const defaultPatterns = {
	'\'': '’'
};

const ignoredIdentifier = new Set([
	'gql',
	'html',
	'svg'
]);

const ignoredMemberExpressionObject = new Set([
	'styled'
]);

const isIgnoredTag = node => {
	if (!node.parent || !node.parent.parent || !node.parent.parent.tag) {
		return false;
	}

	const {tag} = node.parent.parent;

	if (tag.type === 'Identifier' && ignoredIdentifier.has(tag.name)) {
		return true;
	}

	if (tag.type === 'MemberExpression') {
		const {object} = tag;
		if (
			object.type === 'Identifier' &&
			ignoredMemberExpressionObject.has(object.name)
		) {
			return true;
		}
	}

	return false;
};

const defaultMessage = 'Prefer `{{suggest}}` over `{{match}}`.';

function getReplacements(patterns) {
	return Object.entries({
		...defaultPatterns,
		...patterns
	})
		.filter(([, options]) => options !== false)
		.map(([match, options]) => {
			if (typeof options === 'string') {
				options = {
					suggest: options
				};
			}

			return {
				match,
				regex: new RegExp(match, 'gu'),
				fix: true,
				...options
			};
		});
}

const create = context => {
	const {patterns} = {
		patterns: {},
		...context.options[0]
	};
	const replacements = getReplacements(patterns);

	if (replacements.length === 0) {
		return {};
	}

	return {
		'Literal, TemplateElement': node => {
			const {type} = node;

			let string;
			if (type === 'Literal') {
				string = node.value;
				if (typeof string !== 'string') {
					return;
				}
			} else if (!isIgnoredTag(node)) {
				string = node.value.raw;
			}

			if (!string) {
				return;
			}

			const replacement = replacements.find(({regex}) => regex.test(string));

			if (!replacement) {
				return;
			}

			const {fix, message = defaultMessage, match, suggest} = replacement;
			const problem = {
				node,
				message,
				data: {
					match,
					suggest
				}
			};

			if (!fix) {
				context.report(problem);
				return;
			}

			const fixed = string.replace(replacement.regex, suggest);
			if (type === 'Literal') {
				problem.fix = fixer => fixer.replaceText(
					node,
					quoteString(fixed, node.raw[0])
				);
			} else {
				problem.fix = fixer => replaceTemplateElement(
					fixer,
					node,
					escapeTemplateElementRaw(fixed)
				);
			}

			context.report(problem);
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			patterns: {
				type: 'object',
				additionalProperties: {
					anyOf: [
						{
							enum: [
								false
							]
						},
						{
							type: 'string'
						},
						{
							type: 'object',
							required: [
								'suggest'
							],
							properties: {
								suggest: {
									type: 'string'
								},
								fix: {
									type: 'boolean'
									// Default: true
								},
								message: {
									type: 'string'
									// Default: ''
								}
							},
							additionalProperties: false
						}
					]
				}}
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
		fixable: 'code',
		schema
	}
};
