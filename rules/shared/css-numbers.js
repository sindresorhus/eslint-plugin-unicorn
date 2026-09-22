import {tokenize, tokenTypes} from '@eslint/css-tree';

const numericTokenTypes = new Set([tokenTypes.Number, tokenTypes.Dimension, tokenTypes.Percentage]);
const mergingTokenTypes = new Set([...numericTokenTypes, tokenTypes.Ident, tokenTypes.Hash, tokenTypes.AtKeyword]);
const mergingDelimiters = new Set(['.', '#', '@']);

// Read numeric tokens, including custom property values, without touching strings, URLs, comments, or units.
export default function getCssNumbers(node, context) {
	const {sourceCode} = context;
	const nodeRange = sourceCode.getRange(node);
	const scanNode = node.type === 'Raw' ? node : sourceCode.getParent(node) ?? node;
	const text = sourceCode.getText(scanNode);
	const [offset] = sourceCode.getRange(scanNode);
	const numbers = [];
	const tokens = [];
	tokenize(text, (type, start, end) => {
		tokens.push({type, start, end});
	});
	for (const [index, {type, start, end}] of tokens.entries()) {
		if (!numericTokenTypes.has(type) || offset + start < nodeRange[0] || offset + end > nodeRange[1]) {
			continue;
		}

		const [raw] = text.slice(start, end).match(/^[+\-]?(?:\d*\.\d+|\d+)(?:e[+\-]?\d+)?/iv);
		const previous = tokens[index - 1];
		const next = tokens[index + 1];
		const hasMergingNeighbor = (previous?.end === start && (
			mergingTokenTypes.has(previous.type)
			|| (previous.type === tokenTypes.Delim && mergingDelimiters.has(text.slice(previous.start, previous.end)))
		))
		|| (next?.start === end && mergingTokenTypes.has(next.type));
		numbers.push({raw, numberRange: [offset + start, offset + start + raw.length], hasMergingNeighbor});
	}

	return numbers;
}
