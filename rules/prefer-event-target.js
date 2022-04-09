'use strict';
const MESSAGE_ID = 'prefer-event-target';
const messages = {
	[MESSAGE_ID]: 'Prefer `EventTarget` over `EventEmitter`.',
};

const eventEmitterClassSelector = [
	':matches(ClassDeclaration, ClassExpression)',
	'[superClass.name="EventEmitter"]',
	'[body.type="ClassBody"]',
].join('');

const newEventEmitterSelector = [
	'NewExpression',
	'[callee.name="EventEmitter"]',
].join('');

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	[eventEmitterClassSelector](node) {
		return {
			node,
			messageId: MESSAGE_ID,
		};
	},
	[newEventEmitterSelector](node) {
		return {
			node,
			messageId: MESSAGE_ID,
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `EventTarget` over `EventEmitter`.',
		},
		messages,
	},
};
