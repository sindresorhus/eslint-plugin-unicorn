'use strict';
const assert = require('node:assert');
const {
	isCommaToken,
} = require('@eslint-community/eslint-utils');
const {methodCallSelector} = require('../../rules/selectors/index.js');

const MESSAGE_ID_DISALLOWED_PROPERTY = 'disallow-property';
const MESSAGE_ID_NO_SINGLE_CODE_OBJECT = 'use-string';
const MESSAGE_ID_REMOVE_FIX_MARK_COMMENT = 'remove-fix-mark';
const messages = {
	[MESSAGE_ID_DISALLOWED_PROPERTY]: '"{{name}}" not allowed.{{autoFixEnableTip}}',
	[MESSAGE_ID_NO_SINGLE_CODE_OBJECT]: 'Use string instead of object with "code".',
	[MESSAGE_ID_REMOVE_FIX_MARK_COMMENT]: 'This comment should be removed.',
};

// Top-level `test.snapshot({invalid: []})`
const snapshotTestCallSelector = [
	'Program > ExpressionStatement.body > .expression',
	// `test.snapshot()`
	methodCallSelector({
		argumentsLength: 1,
		object: 'test',
		method: 'snapshot',
	}),
].join('');

const propertySelector = [
	snapshotTestCallSelector,
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

// The fix deletes lots of code, disabled auto-fix by default, unless `/* fix */ test.snapshot()` pattern is used.
function getFixMarkComment(snapshotTestCall, sourceCode) {
	assert.ok(snapshotTestCall.type === 'CallExpression');
	const comment = sourceCode.getTokenBefore(snapshotTestCall, {includeComments: true});

	if (
		(comment?.type === 'Block' || comment?.type === 'Line')
		&& comment.value.trim().toLowerCase() === 'fix'
		&& (
			comment.loc.start.line === snapshotTestCall.loc.start.line
			|| comment.loc.start.line === snapshotTestCall.loc.start.line - 1
		)
	) {
		return comment;
	}
}

module.exports = {
	create(context) {
		const sourceCode = context.getSourceCode();

		return {
			[snapshotTestCallSelector](snapshotTestCall) {
				const comment = getFixMarkComment(snapshotTestCall, sourceCode);

				if (!comment) {
					return;
				}

				context.report({
					node: comment,
					messageId: MESSAGE_ID_REMOVE_FIX_MARK_COMMENT,
				});
			},
			[propertySelector](propertyNode) {
				const {key} = propertyNode;

				switch (key.name) {
					case 'errors':
					case 'output': {
						const canFix = sourceCode.getCommentsInside(propertyNode).length === 0;
						const hasFixMark = Boolean(getFixMarkComment(
							propertyNode.parent.parent.parent.parent.parent,
							sourceCode,
						));

						context.report({
							node: key,
							messageId: MESSAGE_ID_DISALLOWED_PROPERTY,
							data: {
								name: key.name,
								autoFixEnableTip: !hasFixMark && canFix
									? ' Put /* fix */ before `test.snapshot()` to enable auto-fix.'
									: '',
							},
							fix: hasFixMark && canFix
								? fixer => removeObjectProperty(propertyNode, fixer, sourceCode)
								: undefined
							,
						});
						break;
					}

					case 'code': {
						const testCase = propertyNode.parent;
						if (testCase.properties.length === 1) {
							const commentsCount = sourceCode.getCommentsInside(testCase).length
								- sourceCode.getCommentsInside(propertyNode).length;
							context.report({
								node: testCase,
								messageId: MESSAGE_ID_NO_SINGLE_CODE_OBJECT,
								fix: commentsCount === 0
									? fixer => fixer.replaceText(testCase, sourceCode.getText(propertyNode.value))
									: undefined,
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
