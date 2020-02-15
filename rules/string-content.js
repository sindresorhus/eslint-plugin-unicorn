'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceTemplateElement = require('./utils/replace-template-element');

const defaultPatterns = {
	'\'': '’'
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
		patterns: [],
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
			} else {
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

			let fixed = string.replace(replacement.regex, suggest);
			if (type === 'Literal') {
				const quote = node.raw[0];
				fixed = fixed.replace(new RegExp(quote, 'g'), `\\${quote}`);
				const {range: [start, end]} = node;
				const fixRange = [start + 1, end - 1];
				problem.fix = fixer => fixer.replaceTextRange(fixRange, fixed);
			} else {
				fixed = fixed.replace(/`/g, '\\`').replace(/\$(?={)/g, '\\$');
				problem.fix = fixer => replaceTemplateElement(fixer, node, fixed);
			}

			context.report(problem);
		}
	};
};

const schema = [{
	type: 'object',
	properties: {
		patterns: {
			type: 'object',
			additionalProperties: {
				anyOf: [
					{
						enum: [false]
					},
					{type: 'string'},
					{
						type: 'object',
						required: ['suggest'],
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
}];

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
