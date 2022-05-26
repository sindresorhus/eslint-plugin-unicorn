'use strict';
const path = require('node:path');

const messageId = path.basename(__filename, '.js');

const shouldReport = (string, value) => {
	const index = string.indexOf(`=${value}]`);

	if (index === -1) {
		return false;
	}

	return string[index - 1] !== '!';
};

module.exports = {
	create(context) {
		return {
			'TemplateElement, Literal'(node) {
				const string = node.value;
				if (typeof string !== 'string') {
					return;
				}

				for (const value of [true, false]) {
					if (shouldReport(string, value)) {
						context.report({
							node,
							messageId,
							data: {
								preferred: String(!value),
							},
						});
					}
				}
			},
		};
	},
	meta: {
		messages: {
			[messageId]: 'Prefer use `[…!={{preferred}}]` in esquery selector.',
		},
	},
};
