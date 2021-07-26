'use strict';
const {memberExpressionSelector} = require('./selectors/index.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Prefer `.textContent` over `.innerText`.',
	[SUGGESTION]: 'Switch to `.textContent`.',
};

const memberExpressionPropertySelector = `${memberExpressionSelector('innerText')} > .property`;
const destructuringSelector = [
	'ObjectPattern',
	' > ',
	'Property.properties',
	'[kind="init"]',
	'[computed!=true]',
	' > ',
	'Identifier.key',
	'[name="innerText"]',
].join('');

const create = () => {
	return {
		[memberExpressionPropertySelector](node) {
			return {
				node,
				messageId: ERROR,
				suggest: [
					{
						messageId: SUGGESTION,
						fix: fixer => fixer.replaceText(node, 'textContent'),
					},
				],
			};
		},
		[destructuringSelector](node) {
			return {
				node,
				messageId: ERROR,
				suggest: [
					{
						messageId: SUGGESTION,
						fix: fixer => fixer.replaceText(
							node,
							node.parent.shorthand ? 'textContent: innerText' : 'textContent',
						),
					},
				],
			};
		},
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.textContent` over `.innerText`.',
		},
		messages,
		hasSuggestions: true,
	},
};
