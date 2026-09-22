/**
Visit decoded JSON object keys, YAML string scalar keys, and individual TOML key segments.
*/
export default function onDataKey(context, listener) {
	context.on('Member', ({name: node}) => listener({node, name: node.name ?? node.value}));

	context.on('YAMLPair', ({key: node}) => {
		if (node?.type === 'YAMLScalar' && typeof node.value === 'string' && !(node.style === 'plain' && node.value === '<<')) {
			return listener({node, name: node.value});
		}
	});

	context.on('TOMLKey', function * ({keys}) {
		for (const node of keys) {
			yield listener({node, name: node.name ?? node.value});
		}
	});
}
