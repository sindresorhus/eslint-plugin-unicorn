export default function isOnSameLine(nodeOrTokenA, nodeOrTokenB) {
	return sourceCode.getLoc(nodeOrTokenA).start.line === sourceCode.getLoc(nodeOrTokenB).start.line;
}
