'use strict';
const path = require('node:path');

const messageId = path.basename(__filename, '.js');

module.exports = {
	create(context) {
		if (path.basename(context.physicalFilename) === 'snapshot-rule-tester.mjs') {
			return {};
		}

		return {
			MemberExpression(node) {
				if (
					!(
						!node.computed
						&& !node.optional
						&& node.object.type === 'Identifier'
						&& node.object.name === 'test'
						&& node.property.type === 'Identifier'
						&& node.property.name === 'only'
					)
				) {
					return;
				}

				const isTaggedTemplateExpression = node.parent.type === 'TaggedTemplateExpression' && node.parent.tag === node;
				const isCallee = !isTaggedTemplateExpression
					&& node.parent.type === 'CallExpression'
					&& node.parent.callee === node
					&& !node.parent.optional
					&& node.parent.arguments.length === 1;

				const problem = {node, messageId};

				if (isTaggedTemplateExpression) {
					problem.fix = fixer => fixer.remove(node);
				}

				if (isCallee) {
					problem.fix = function * (fixer) {
						const {sourceCode} = context;
						const openingParenToken = sourceCode.getTokenAfter(node);
						const closingParenToken = sourceCode.getLastToken(node.parent);
						if (openingParenToken.value !== '(' || closingParenToken.value !== ')') {
							return;
						}

						yield fixer.remove(node);
						yield fixer.remove(openingParenToken);
						yield fixer.remove(closingParenToken);

						// Trialing comma
						const tokenBefore = sourceCode.getTokenBefore(closingParenToken);

						if (tokenBefore.value !== ',') {
							return;
						}

						yield fixer.remove(tokenBefore);
					};
				}

				context.report(problem);
			},
		};
	},
	meta: {
		fixable: 'code',
		messages: {
			[messageId]: '`test.only` can not be used.',
		},
	},
};
