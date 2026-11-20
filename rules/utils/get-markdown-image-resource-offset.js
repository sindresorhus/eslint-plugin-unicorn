/**
Get the offset after `](` relative to one complete inline Markdown image's source.
*/
export default function getMarkdownImageResourceOffset(text) {
	// The Markdown parser already identified a complete inline image, so a unique `](` must be its destination boundary.
	const delimiter = text.indexOf('](');
	// Repeated delimiters in labels, titles, or destinations are intentionally unsupported instead of reparsing Markdown.
	if (delimiter !== -1 && delimiter === text.lastIndexOf('](')) {
		return delimiter + 2;
	}
}
