import {
	isNewExpression,
	isMethodCall,
} from './ast/index.js';
import {
	switchNewExpressionToCallExpression,
} from './fix/index.js';
import {
	getParenthesizedRange,
	isParenthesized,
	needsSemicolon,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-response-static-json';
const messages = {
	[MESSAGE_ID]: 'Prefer using `Response.json(…)` over `JSON.stringify()`.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	NewExpression(newExpression) {
		if (!isNewExpression(newExpression, {name: 'Response', minimumArguments: 1})) {
			return;
		}

		const [jsonStringifyNode] = newExpression.arguments;
		if (!isMethodCall(jsonStringifyNode, {
			object: 'JSON',
			method: 'stringify',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		return {
			node: jsonStringifyNode.callee,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const {sourceCode} = context;
				yield fixer.insertTextAfter(newExpression.callee, '.json');
				yield * switchNewExpressionToCallExpression(newExpression, sourceCode, fixer);

				const [dataNode] = jsonStringifyNode.arguments;
				const callExpressionRange = getParenthesizedRange(jsonStringifyNode, sourceCode);
				const dataNodeRange = getParenthesizedRange(dataNode, sourceCode);
				// `(( JSON.stringify( (( data )), ) ))`
				//  ^^^^^^^^^^^^^^^^^^^
				yield fixer.removeRange([callExpressionRange[0], dataNodeRange[0]]);
				// `(( JSON.stringify( (( data )), ) ))`
				//                               ^^^^^^
				yield fixer.removeRange([dataNodeRange[1], callExpressionRange[1]]);

				if (
					!isParenthesized(newExpression, sourceCode)
					&& isParenthesized(newExpression.callee, sourceCode)
				) {
					const tokenBefore = sourceCode.getTokenBefore(newExpression);
					if (needsSemicolon(tokenBefore, sourceCode, '(')) {
						yield fixer.insertTextBefore(newExpression, ';');
					}
				}
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Response.json()` over `new Response(JSON.stringify())`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',

		messages,
	},
};

export default config;
