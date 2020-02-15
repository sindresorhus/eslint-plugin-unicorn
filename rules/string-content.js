'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const defaultPatterns = {
	'\'': '’'
};

const message = `Prefer {suggest} over {match}.`;

function getReplacements(options) {
	const {} = options;

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

			const {suggest} = options;

			return {
				match,
				regex: new RegExp(match, 'gu'),
				fix: true,
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

			for (const {regex, fix} = replacements) {
				if (regex.test(value)) {
					const problem = {
						node,
						message,
						data: {
							match,
							suggest
						}
					}

					if (fix) {
						const quote = node.raw[0];
						const fixed = quote +
							value.replace(regex, suggest).replace(new RegExp(quote, 'g'), `\\${quote}`) +
							quote;
						problem.fix = fixer => fixer.replaceText(node, fixed);
					}
					return context.report(problem);
				}
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
