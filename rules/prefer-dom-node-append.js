'use strict';
const isValueNotUsable = require('./utils/is-value-not-usable.js');
const {methodCallSelector, notDomNodeSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-dom-node-append';
const messages = {
	[MESSAGE_ID]: 'Prefer `Node#append()` over `Node#appendChild()`.'
};
const selector = [
	methodCallSelector({
		name: 'appendChild',
		length: 1
	}),
	notDomNodeSelector('callee.object'),
	notDomNodeSelector('arguments.0')
].join('');

const create = () => {
	return {
		[selector](node) {
			const fix = isValueNotUsable(node) ?
				fixer => fixer.replaceText(node.callee.property, 'append') :
				undefined;

			return {
				node,
				messageId: MESSAGE_ID,
				fix
			};
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Node#append()` over `Node#appendChild()`.'
		},
		fixable: 'code',
		messages
	}
};
