import assert from 'node:assert';
import {isCommaToken} from '@eslint-community/eslint-utils';
import {isMethodCall} from '../../rules/ast/index.js';

const MESSAGE_ID_DISALLOWED_PROPERTY = 'disallow-property';
const MESSAGE_ID_NO_SINGLE_CODE_OBJECT = 'use-string';
const MESSAGE_ID_REMOVE_FIX_MARK_COMMENT = 'remove-fix-mark';
const messages = {
	[MESSAGE_ID_DISALLOWED_PROPERTY]: '"{{name}}" not allowed.{{autoFixEnableTip}}',
	[MESSAGE_ID_NO_SINGLE_CODE_OBJECT]: 'Use string instead of object with "code".',
	[MESSAGE_ID_REMOVE_FIX_MARK_COMMENT]: 'This comment should be removed.',
};

// Top-level `test.snapshot({invalid: []})`
const isTestSnapshot = node =>
	// `test.snapshot()`
	isMethodCall(node, {
		argumentsLength: 1,
		object: 'test',
		method: 'snapshot',
		optionalCall: false,
		optionalMember: false,
	})
	&& node.parent.type === 'ExpressionStatement'
	&& node.parent.expression === node
	&& node.parent.parent.type === 'Program'
	&& node.parent.parent.body.includes(node.parent);

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

function checkFixMark(node, context) {
	const comment = getFixMarkComment(node, context.sourceCode);

	if (!comment) {
		return;
	}

	context.report({
		node: comment,
		messageId: MESSAGE_ID_REMOVE_FIX_MARK_COMMENT,
	});
}

function checkInvalidCases(node, context) {
	const testCasesNode = node.arguments[0];
	if (testCasesNode?.type !== 'ObjectExpression') {
		return;
	}

	/*
	```
	test.snapshot({
		invalid: [], <- Property
	})
	```
	*/
	const invalidCasesNode = testCasesNode.properties.find(node =>
		node.type === 'Property'
		&& !node.computed
		&& !node.method
		&& !node.shorthand
		&& node.kind === 'init'
		&& node.key.type === 'Identifier'
		&& node.key.name === 'invalid'
		&& node.value.type === 'ArrayExpression',
	);

	if (!invalidCasesNode) {
		return;
	}

	for (const testCaseNode of invalidCasesNode.value.elements) {
		if (testCaseNode?.type !== 'ObjectExpression') {
			continue;
		}

		for (const propertyNode of testCaseNode.properties) {
			if (propertyNode.type !== 'Property' || propertyNode.computed || propertyNode.key.type !== 'Identifier') {
				continue;
			}

			checkTestCaseProperty(propertyNode, context);
		}
	}
}

function checkTestCaseProperty(propertyNode, context) {
	const {key} = propertyNode;
	const {sourceCode} = context;

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
					: undefined,
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
}

const config = {
	create(context) {
		return {
			CallExpression(snapshotTestCall) {
				if (!isTestSnapshot(snapshotTestCall)) {
					return;
				}

				checkFixMark(snapshotTestCall, context);
				checkInvalidCases(snapshotTestCall, context);
			},
		};
	},
	meta: {
		fixable: 'code',
		messages,
	},
};

export default config;
