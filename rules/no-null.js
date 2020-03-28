'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');

const objectCreateSelector = methodSelector({
	object: 'Object',
	name: 'create',
	length: 1
});

const selector = [
	`:not(${objectCreateSelector})`,
	'>',
	'Literal',
	'[raw="null"]'
].join('');

const create = context => ({
	[selector]: node => {
		context.report({
			node,
			message: 'Use undefined instead of null'
		});
	}
});

module.exports = {
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		}
	},
	create
};
