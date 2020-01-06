'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const defaultPatterns = {
	'\'': '’'
};

function getReplacements(options) {
	const {patterns} = options;

	return Object.entries({
		...defaultPatterns,
		...patterns
	}).filter(([, options]) => options !== false)
		.map(([match, options]) => {
			if (typeof options === 'string') {
				options = {
					suggest: options
				};
			}

			const {suggest} = options;

			return {
				match,
				regex: new RegExp(match, 'gu'),
				fix: true,
				message: `Prefer \`${suggest}\` over \`${match}\`.`,
				...options
			};
		});
}

const create = context => {
	const replacements = getReplacements(context.options[0] || {});

	if (replacements.length === 0) {
		return {};
	}

	return {
		Literal: node => {
			const {value} = node;

			if (typeof value !== 'string') {
				return;
			}

			const reported = replacements.filter(({regex}) => regex.test(value));
			const fixed = reported.reduce((fixed, {fix, regex, suggest}) => fix ? fixed.replace(regex, suggest) : fixed
				, value);

			let fix;

			if (fixed !== value) {
				const quote = node.raw[0];
				const escaped = fixed.replace(new RegExp(quote, 'g'), `\\${quote}`);
				fix = fixer => fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], escaped);
			}

			for (const {message} of reported) {
				context.report({
					node,
					message,
					fix
				});
			}
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
