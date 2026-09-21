/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-declarations-after-nested-rules';
const messages = {
	[MESSAGE_ID]: 'Do not place declarations after nested rules.',
};

const isNestedRule = node => node.type === 'Rule' || (node.type === 'Atrule' && node.block !== null);

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on('Block', function * (block) {
		let hasSeenNestedRule = false;

		for (const child of block.children) {
			if (isNestedRule(child)) {
				hasSeenNestedRule = true;
				continue;
			}

			if (hasSeenNestedRule && child.type === 'Declaration') {
				yield {
					node: child,
					messageId: MESSAGE_ID,
				};
			}
		}
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow declarations after nested rules.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
