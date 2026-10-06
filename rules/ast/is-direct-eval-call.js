import unwrapTypeScriptExpression from '../utils/unwrap-typescript-expression.js';

/**
Check if the node is a direct `eval` call, which can read and declare variables in the calling scope.

`eval(code)`, `(eval)(code)`, and TypeScript wrappers like `(eval as any)(code)` are direct calls. `(0, eval)(code)`, `eval?.(code)`, and `globalThis.eval(code)` are indirect calls.

@param {import('estree').Node} node
@returns {boolean}
*/
export default function isDirectEvalCall(node) {
	if (node?.type !== 'CallExpression' || node.optional) {
		return false;
	}

	const callee = unwrapTypeScriptExpression(node.callee);
	return callee.type === 'Identifier' && callee.name === 'eval';
}
