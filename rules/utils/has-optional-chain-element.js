import unwrapTypeScriptExpression, {isTypeScriptExpressionWrapper} from './unwrap-typescript-expression.js';
import {getParentheses} from './parentheses/parentheses.js';

const isChainElement = node => node?.type === 'MemberExpression' || node?.type === 'CallExpression';

export default function hasOptionalChainElement(node) {
	node = unwrapTypeScriptExpression(node);

	if (node?.type === 'ChainExpression') {
		return hasOptionalChainElement(node.expression);
	}

	if (!isChainElement(node)) {
		return false;
	}

	if (node.optional) {
		return true;
	}

	return node.type === 'MemberExpression'
		? hasOptionalChainElement(node.object)
		: hasOptionalChainElement(node.callee);
}

export function hasUnparenthesizedOptionalChainElement(node, context) {
	if (isTypeScriptExpressionWrapper(node)) {
		return getParentheses(node, context).length === 0
			&& hasUnparenthesizedOptionalChainElement(node.expression, context);
	}

	if (node?.type === 'ChainExpression') {
		return getParentheses(node, context).length === 0
			&& hasUnparenthesizedOptionalChainElement(node.expression, context);
	}

	if (!isChainElement(node)) {
		return false;
	}

	if (node.optional) {
		return true;
	}

	return hasUnparenthesizedOptionalChainElement(
		node.type === 'MemberExpression' ? node.object : node.callee,
		context,
	);
}
