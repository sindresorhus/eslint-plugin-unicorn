'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MAX_REPLACEMENTS = 3;

function message(replacements) {
	replacements = replacements.map(({match, suggest}) => `\`${suggest}\` over \`${match}\``);

	const last = replacements.pop();

	const hasMore = replacements.length >= MAX_REPLACEMENTS - 1;

	let message = 'Prefer ';
	if (replacements.length !== 0) {
		message += replacements.slice(0, MAX_REPLACEMENTS - 1).join(' ,');

		if (hasMore) {
			message += ' …';
		}

		message += ' and ';
	}

	return `${message}${last}`;
}

const create = context => {
	const {patterns = []} = context.options[0] || {};

	if (patterns.length === 0) {
		return {};
	}

	return {
		Literal: node => {
			const {value} = node;

			if (typeof value !== 'string') {
				return;
			}

			const reportedPatterns = patterns.filter(({match}) => value.includes(match));

			if (reportedPatterns.length === 0) {
				return;
			}

			const fixed = reportedPatterns.filter(({fix}) => fix).reduce((fixed, {match, suggest}) => fixed.split(match).join(suggest), value);
			const quote = node.raw[0];
			const escaped = fixed.replace(new RegExp(quote, 'g'), `\\${quote}`);
			const fix = fixed === value ?
				undefined :
				fixer => fixer.replaceTextRange([node.range[0] + 1, node.range[1] - 1], escaped);

			context.report({
				node,
				message: message(reportedPatterns),
				fix
			});
		}
	};
};

const patternSchema = {
	type: 'object',
	properties: {
		match: {
			type: 'string',
			require: true
		},
		suggest: {
			type: 'string',
			require: true
		},
		fix: {
			type: 'boolean',
			default: true
		}
	},
	additionalProperties: false
};
const schema = [{
	type: 'object',
	properties: {
		patterns: {
			type: 'array',
			items: patternSchema
		}
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
