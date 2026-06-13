import {isKnownNonArray} from './is-array.js';

const directlyReportableReceiverTypes = new Set([
	'ArrayExpression',
	'FunctionExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
]);

export default function shouldSkipKnownNonArrayReceiver(node, context) {
	return !directlyReportableReceiverTypes.has(node.type) && isKnownNonArray(node, context);
}
