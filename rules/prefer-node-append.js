'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');
const methodSelector = require('./utils/method-selector');
const {notDomNodeSelector} = require('./utils/not-dom-node');

const message = 'Prefer `Node#append()` over `Node#appendChild()`.';
const selector = [
	methodSelector({
		name: 'appendChild',
		length: 1
	}),
	notDomNodeSelector('callee.object'),
	notDomNodeSelector('arguments.0')
].join('');

const create = context => {
	return {
		[selector](node) {
			const fix = isValueNotUsable(node) ?
				fixer => fixer.replaceText(node.callee.property, 'append') :
				undefined;

			context.report({
				node,
				message,
				fix
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
