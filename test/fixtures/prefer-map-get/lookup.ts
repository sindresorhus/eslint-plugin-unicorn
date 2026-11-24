export {};

const map = new Map<string, number>([['key', 0]]);
if (map.has('key')) {
	const entry = map.get('key');
	console.log(entry);
}
