'use strict';
const {matches} = require('./selectors/index.js');

const MESSAGE_ID = 'prefer-event-target';
const messages = {
	[MESSAGE_ID]: 'Prefer `EventTarget` over `EventEmitter`.',
};

const eventEmitterClassNameSelector = [
	matches(['ClassDeclaration', 'ClassExpression']),
	' > ',
	'Identifier[name="EventEmitter"]',
].join('');

const eventEmitterSuperClassSelector = [
	matches(['ClassDeclaration', 'ClassExpression']),
	'[body.type="ClassBody"]',
	' > ',
	matches([
		'Identifier.superClass[name="EventEmitter"]',
		'MemberExpression.superClass[property.name="EventEmitter"]',
	]),
].join('');

const newEventEmitterSelector = [
	matches(['NewExpression', 'CallExpression']),
	' > ',
	'Identifier.callee',
	'[name="EventEmitter"]',
].join('');

const selector = matches([
	eventEmitterSuperClassSelector,
	eventEmitterClassNameSelector,
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
