import path from 'node:path';
import {fileURLToPath} from 'node:url';

const messageId = path.basename(fileURLToPath(import.meta.url), '.js');

const config = {
	create(context) {
		const {sourceCode} = context;

		return {
			YieldExpression(yieldExpression) {
				if (!yieldExpression.delegate) {
					return;
				}

				const scope = sourceCode.getScope(yieldExpression).variableScope;
				const functionNode = scope.block;
				if (!functionNode.params.some(node => node.type === 'Identifier' && node.name === 'fixer')) {
					return;
				}

				const starToken = sourceCode.getFirstToken(yieldExpression, {skip: 1});
				const [start, end] = sourceCode.getRange(starToken);

				context.report({
					node: starToken,
					messageId,
					fix: fixer => fixer.removeRange([
						start,
						end + (sourceCode.text[start - 1] === ' ' && sourceCode.text[end + 1] === ' ' ? 1 : 0),
					]),
				});
			},
		};
	},
	meta: {
		fixable: 'code',
		messages: {
			[messageId]: 'Unnecessary to delegate fixes',
		},
	},
};

export default config;
