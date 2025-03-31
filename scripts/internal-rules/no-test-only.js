import path from 'node:path';
import {fileURLToPath} from 'node:url';

const messageId = path.basename(fileURLToPath(import.meta.url), '.js');

const config = {
	create(context) {
		if (path.basename(context.physicalFilename) === 'snapshot-rule-tester.js') {
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

						// Trailing comma
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
			[messageId]: '`test.only` should only be used for debugging purposes. Please remove it before committing.',
		},
	},
};

export default config;
