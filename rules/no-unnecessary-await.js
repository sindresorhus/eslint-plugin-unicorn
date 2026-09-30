import {isFunction} from './ast/index.js';
import {addParenthesesToReturnOrThrowExpression, removeSpacesAfter} from './fix/index.js';
import {
	isParenthesized,
	needsSemicolon,
	isOnSameLine,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-unnecessary-await';
const messages = {
	[MESSAGE_ID]: 'Do not `await` non-promise value.',
};

function notPromise(node) {
	switch (node.type) {
		case 'ArrayExpression':
		case 'ArrowFunctionExpression':
		case 'AwaitExpression':
		case 'BinaryExpression':
		case 'ClassExpression':
		case 'FunctionExpression':
		case 'JSXElement':
		case 'JSXFragment':
		case 'Literal':
		case 'TemplateLiteral':
		case 'UnaryExpression':
		case 'UpdateExpression': {
			return true;
		}

		case 'SequenceExpression': {
			return notPromise(node.expressions.at(-1));
		}

		// No default
	}

	return false;
}

/*
`await` on a value that is not a promise still suspends the function for a microtask, so removing it makes everything after it run in the same tick, which can reorder it against the caller or another microtask. Only an `await` that is the last thing its function (or module) runs is safe to unroll.
*/
function isLastEvaluated(node) {
	const {parent} = node;
	switch (parent.type) {
		case 'ArrowFunctionExpression': {
			return parent.body === node;
		}

		case 'Program': {
			return parent.body.at(-1) === node;
		}

		case 'BlockStatement': {
			return parent.body.at(-1) === node && (isFunction(parent.parent) || isLastEvaluated(parent));
		}

		case 'IfStatement': {
			return parent.test !== node && isLastEvaluated(parent);
		}

		case 'VariableDeclaration': {
			return parent.declarations.at(-1) === node && isLastEvaluated(parent);
		}

		case 'ExpressionStatement':
		case 'ReturnStatement':
		case 'ThrowStatement':
		case 'VariableDeclarator': {
			return isLastEvaluated(parent);
		}

		default: {
			return false;
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('AwaitExpression', node => {
		if (
			// F#-style pipeline operator, `Promise.resolve() |> await`
			!node.argument
			|| !notPromise(unwrapTypeScriptExpression(node.argument))
		) {
			return;
		}

		const {sourceCode} = context;
		const awaitToken = sourceCode.getFirstToken(node);
		const problem = {
			node,
			loc: sourceCode.getLoc(awaitToken),
			messageId: MESSAGE_ID,
		};

		const valueNode = node.argument;
		if (
			// Removing `await` may change them to a declaration, if there is no `id` will cause SyntaxError
			valueNode.type === 'FunctionExpression'
			|| valueNode.type === 'ClassExpression'
			// This also covers `+await +1`, the unary operator runs after the `await`
			|| !isLastEvaluated(node)
		) {
			return problem;
		}

		return Object.assign(problem, {
			/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
			* fix(fixer) {
				if (
					!isOnSameLine(awaitToken, valueNode, context)
					&& !isParenthesized(node, context)
				) {
					yield addParenthesesToReturnOrThrowExpression(fixer, node.parent, context);
				}

				yield fixer.remove(awaitToken);
				yield removeSpacesAfter(awaitToken, context, fixer);

				const nextToken = sourceCode.getTokenAfter(awaitToken);
				const tokenBefore = sourceCode.getTokenBefore(awaitToken);
				if (needsSemicolon(tokenBefore, context, nextToken.value)) {
					yield fixer.insertTextBefore(nextToken, ';');
				}
			},
		});
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow awaiting non-promise values.',
			recommended: 'unopinionated',
		},
		fixable: 'code',

		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
