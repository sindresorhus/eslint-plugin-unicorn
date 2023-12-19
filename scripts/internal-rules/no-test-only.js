'use strict';
const path = require('node:path');

const messageId = path.basename(__filename, '.js');

module.exports = {
	create(context) {
		if (path.basename(context.physicalFilename) === 'snapshot-rule-tester.mjs') {
			return {};
		}

		return {
			MemberExpression(node) {
				if (
					!(
						!node.computed
						&& !node.optional
						&& node.object.type === 'Identifier'
						&& node.object.name === 'test'
						&& node.property.type === 'Identifier'
						&& node.property.name === 'only'
					)
				) {
					return;
				}

				context.report({
					node,
					messageId,
				});
			},
		};
	},
	meta: {
		messages: {
			[messageId]: '`test.only` can not be used.',
		},
	},
};
