import {isLoop} from './ast/index.js';
import {removeStatement} from './fix/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-useless-continue';
const messages = {
	[MESSAGE_ID]: 'Unnecessary `continue` statement.',
};

// Whether `continue` would be reached as the last thing in the current loop iteration,
// meaning the loop advances to the next iteration regardless of whether it's there.
const isUselessContinue = node => {
	// Must sit directly in a block, so removing it leaves valid code and we skip
	// bare-body spin loops like `while (cond) continue;`.
	if (node.parent.type !== 'BlockStatement') {
		return false;
	}

	let current = node;

	for (;;) {
		const {parent} = current;

		if (parent.type === 'BlockStatement') {
			if (parent.body.at(-1) !== current) {
				return false;
			}

			current = parent;
			continue;
		}

		if (parent.type === 'IfStatement' && (parent.consequent === current || parent.alternate === current)) {
			current = parent;
			continue;
		}

		// Reaching the loop means it's useless. Anything else (a `switch` case or a
		// `try`/`catch`/`finally` block) is a non-loop parent, so it's left alone.
		return isLoop(parent) && parent.body === current;
	}
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('ContinueStatement', node => {
		// A labeled `continue` may target an outer loop.
		if (node.label || !isUselessContinue(node)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			/** @param {ESLint.Rule.RuleFixer} fixer */
			fix: fixer => removeStatement(node, context, fixer),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless `continue` statements.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
