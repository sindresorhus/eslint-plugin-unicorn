'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const isCommaFollwedWithComma = (el, index, array) => {
	if (el === null) {
		return array[index + 1] === el;
	}
};

const create = context => {
	return {
		ArrayPattern(node) {
			const {elements} = node;
			if (!elements || elements.length === 0) {
				return;
			}

			if (elements.some(isCommaFollwedWithComma)) {
				context.report({
					node,
					message: 'Only one ignored value in series allowed in array destructuring.'
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		}
	}
};
