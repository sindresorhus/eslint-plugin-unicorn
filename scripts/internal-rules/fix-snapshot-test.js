'use strict';
const {
	isCommaToken,
} = require('@eslint-community/eslint-utils');
const {methodCallSelector} = require('../../rules/selectors/index.js');

const MESSAGE_ID_DISALLOWED_PROPERTY = 'disallow-property';
const MESSAGE_ID_NO_SINGLE_CODE_OBJECT = 'use-string';
const messages = {
	[MESSAGE_ID_DISALLOWED_PROPERTY]: '"{{name}}" not allowed.',
	[MESSAGE_ID_NO_SINGLE_CODE_OBJECT]: 'Use string instead of object with "code".',
};

// Top-level `test.snapshot({invalid: []})`
const selector = [
	'Program > ExpressionStatement.body > .expression',
	// `test.snapshot()`
	methodCallSelector({
		argumentsLength: 1,
		object: 'test',
		method: 'snapshot',
	}),
	' > ObjectExpression.arguments:first-child',
	/*
	```
	test.snapshot({
		invalid: [], <- Property
	})
	```
	*/
	' > Property.properties',
	'[computed!=true]',
	'[method!=true]',
	'[shorthand!=true]',
	'[kind="init"]',
	'[key.type="Identifier"]',
	'[key.name="invalid"]',

	' > ArrayExpression.value',
	' > ObjectExpression.elements',
	' > Property.properties[computed!=true][key.type="Identifier"]',
].join('');

function * removeObjectProperty(node, fixer, sourceCode) {
	yield fixer.remove(node);
	const nextToken = sourceCode.getTokenAfter(node);
	if (isCommaToken(nextToken)) {
		yield fixer.remove(nextToken);
	}
}

module.exports = {
	create(context) {
		const sourceCode = context.getSourceCode();

		return {
			[selector](propertyNode) {
				const {key} = propertyNode;

				switch (key.name) {
					case 'errors':
					case 'output': {
						context.report({
							node: key,
							messageId: MESSAGE_ID_DISALLOWED_PROPERTY,
							data: {name: key.name},
							fix: fixer => removeObjectProperty(propertyNode, fixer, sourceCode),
						});
						break;
					}

					case 'code': {
						const testCase = propertyNode.parent;
						if (testCase.properties.length === 1) {
							context.report({
								node: testCase,
								messageId: MESSAGE_ID_NO_SINGLE_CODE_OBJECT,
								fix: fixer => fixer.replaceText(testCase, sourceCode.getText(propertyNode.value)),
							});
						}

						break;
					}
					// No default
				}
			},
		};
	},
	meta: {
		fixable: 'code',
		messages,
	},
};
