const directlyReportableReceiverTypes = new Set([
	'ArrayExpression',
	'FunctionExpression',
	'Literal',
	'ObjectExpression',
	'TemplateLiteral',
]);

export default function canSkipKnownNonArrayReceiver(node) {
	return !directlyReportableReceiverTypes.has(node.type);
}
