/**
Get HTML comments from Markdown HTML nodes, preserving source offsets for reports and fixes. Code examples and escaped comment markers are excluded by the Markdown parser.

@param {import('eslint').Rule.RuleContext} context
@returns {Array<object>}
*/
export default function getMarkdownHtmlComments(context) {
	const {sourceCode} = context;
	if (sourceCode.ast.type !== 'root') {
		return [];
	}

	const comments = [];
	const {text} = sourceCode;

	const collectComments = node => {
		if (node.type === 'html') {
			const [nodeStart, nodeEnd] = sourceCode.getRange(node);
			const html = text.slice(nodeStart, nodeEnd);
			let searchStart = 0;

			while (searchStart < html.length) {
				const start = html.indexOf('<!--', searchStart);
				if (start === -1) {
					break;
				}

				const closingStart = html.indexOf('-->', start + 4);
				const valueEnd = closingStart === -1 ? html.length : closingStart;
				const end = closingStart === -1 ? html.length : closingStart + 3;
				const range = [nodeStart + start, nodeStart + end];
				comments.push({
					type: 'Block',
					value: html.slice(start + 4, valueEnd),
					range,
					loc: {
						start: sourceCode.getLocFromIndex(range[0]),
						end: sourceCode.getLocFromIndex(range[1]),
					},
				});
				searchStart = end;
			}
		}

		for (const child of node.children ?? []) {
			collectComments(child);
		}
	};

	collectComments(sourceCode.ast);
	return comments;
}
