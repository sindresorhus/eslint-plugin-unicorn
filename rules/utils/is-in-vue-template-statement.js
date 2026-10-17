import getAncestor from './get-ancestor.js';
import getTokenStore from './get-token-store.js';

/**
Check whether `node` is inside a Vue.js template statement body, where source-text fixers cannot preserve statement boundaries.
*/
export default function isInVueTemplateStatement(node, context) {
	return getTokenStore(context, node) !== context.sourceCode
		&& Boolean(getAncestor(node, 'VOnExpression') || getAncestor(node, 'BlockStatement'));
}
