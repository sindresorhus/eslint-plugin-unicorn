'use strict';
const {matches} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-event-target';
const messages = {
	[MESSAGE_ID]: 'Prefer `EventTarget` over `EventEmitter`.',
};

const eventEmitterSuperClassSelector = [
	':matches(ClassDeclaration, ClassExpression)',
	'[superClass.name="EventEmitter"]',
	'[body.type="ClassBody"]',
	' > ',
	'[name="EventEmitter"]',
].join('');

const newEventEmitterSelector = [
	'NewExpression',
	'[callee.name="EventEmitter"]',
	' > ',
	'[name="EventEmitter"]',
].join('');

const selector = matches([
	eventEmitterSuperClassSelector,
	newEventEmitterSelector,
]);

/** @param {import('eslint').Rule.RuleContext} context */
const create = () => ({
	[selector](node) {
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
