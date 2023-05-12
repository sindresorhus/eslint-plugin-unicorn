'use strict';

function getPreviousNode(node, sourceCode) {
	const {parent} = node;
	const visitorKeys = sourceCode.visitorKeys[parent.type] || Object.keys(parent);

	for (const property of visitorKeys) {
		const value = parent[property];
		if (Array.isArray(value)) {
			const index = value.indexOf(node);

			if (index !== -1) {
				return value[index - 1];
			}
		}
	}

	/* c8 ignore next */
	throw new Error('Cannot locate previous node.\nPlease open an issue at https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title=%60getPreviousNode%60%20can%20not%20locate%20sibling');
}

module.exports = getPreviousNode;
