'use strict';
const {methodCallSelector} = require('./selectors/index.js');
const {appendArgument} = require('./fix/index.js');

const ERROR = 'error';
const SUGGESTION_TARGET_LOCATION_ORIGIN = 'target-location-origin';
const SUGGESTION_SELF_LOCATION_ORIGIN = 'self-location-origin';
const SUGGESTION_STAR = 'star';
const messages = {
	[ERROR]: 'Missing the `targetOrigin` argument.',
	[SUGGESTION_TARGET_LOCATION_ORIGIN]: 'Use `{{target}}.location.origin`.',
	[SUGGESTION_SELF_LOCATION_ORIGIN]: 'Use `self.location.origin`.',
	[SUGGESTION_STAR]: 'Use `"*"`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
function create(context) {
	const sourceCode = context.getSourceCode();
	return {
		[methodCallSelector({method: 'postMessage', argumentsLength: 1})](node) {
			const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
			const suggestions = [];
			const target = node.callee.object;
			if (target.type === 'Identifier') {
				const {name} = target;

				suggestions.push({
					messageId: SUGGESTION_TARGET_LOCATION_ORIGIN,
					data: {target: name},
					code: `${target.name}.location.origin`,
				});

				if (name !== 'self' && name !== 'window' && name !== 'globalThis') {
					suggestions.push({messageId: SUGGESTION_SELF_LOCATION_ORIGIN, code: 'self.location.origin'});
				}
			} else {
				suggestions.push({messageId: SUGGESTION_SELF_LOCATION_ORIGIN, code: 'self.location.origin'});
			}

			suggestions.push({messageId: SUGGESTION_STAR, code: '\'*\''});

			return {
				loc: {
					start: penultimateToken.loc.end,
					end: lastToken.loc.end,
				},
				messageId: ERROR,
				suggest: suggestions.map(({messageId, data, code}) => ({
					messageId,
					data,
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix: fixer => appendArgument(fixer, node, code, sourceCode),
				})),
			};
		},
	};
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce using the `targetOrigin` argument with `window.postMessage()`.',
		},
		hasSuggestions: true,
		messages,
	},
};
