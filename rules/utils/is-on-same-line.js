export default function isOnSameLine(nodeOrTokenA, nodeOrTokenB, context) {
	const [
		lineA,
		lineB,
	] = [nodeOrTokenA, nodeOrTokenB].map(nodeOrToken => context.sourceCode.getLoc(nodeOrToken).start.line);
	return lineA === lineB;
}
