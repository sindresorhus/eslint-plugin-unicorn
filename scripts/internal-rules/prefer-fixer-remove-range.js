import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isMethodCall, isLiteral} from '../../rules/ast/index.js';
import {removeArgument} from '../../rules/fix/index.js';

const messageId = path.basename(fileURLToPath(import.meta.url), '.js');

const config = {
	create(context) {
		return {
			CallExpression(callExpression) {
				const [, emptyString] = callExpression.arguments;

				if (!(
					isMethodCall(callExpression, {
						object: 'fixer',
						method: 'replaceTextRange',
						argumentsLength: 2,
						optionalCall: false,
						optionalMember: false,
					})
					&& isLiteral(emptyString, '')
				)) {
					return;
				}

				const {property} = callExpression.callee;
				context.report({
					node: property,
					messageId,
					* fix(fixer) {
						yield removeArgument(fixer, emptyString, context.sourceCode);
						yield fixer.replaceText(property, 'removeRange');
					},
				});
			},
		};
	},
	meta: {
		fixable: 'code',
		messages: {
			[messageId]: 'Prefer `fixer.removeRange(…)` over `fixer.replaceTextRange(…, \'\')`.',
		},
	},
};

export default config;
