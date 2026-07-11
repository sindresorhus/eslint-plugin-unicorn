import {isMap, isScalar, parseDocument} from 'yaml';

const MESSAGE_ID_MISSING_FIELD = 'missing-field';
const messages = {
	[MESSAGE_ID_MISSING_FIELD]: 'Missing required frontmatter field `{{field}}`.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			fields: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
					minLength: 1,
				},
				description: 'Top-level YAML frontmatter fields that are required.',
			},
		},
	},
];

function getFieldNames(document) {
	if (!isMap(document.contents)) {
		return new Set();
	}

	return new Set(document.contents.items
		.filter(pair => isScalar(pair.key) && typeof pair.key.value === 'string')
		.map(pair => pair.key.value));
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {fields} = context.options[0];

	if (fields.length === 0) {
		return;
	}

	context.on('yaml', function * (node) {
		const document = parseDocument(node.value);

		if (document.errors.length > 0) {
			return;
		}

		try {
			// Detect unresolved aliases that are not included in `document.errors`.
			document.toString();
		} catch {
			return;
		}

		const fieldNames = getFieldNames(document);

		for (const field of fields) {
			if (fieldNames.has(field)) {
				continue;
			}

			yield {
				node,
				messageId: MESSAGE_ID_MISSING_FIELD,
				data: {field},
			};
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require configured YAML frontmatter fields.',
			recommended: false,
		},
		schema,
		defaultOptions: [{fields: []}],
		messages,
		languages: [
			// `configs.all` applies every rule to JavaScript files.
			'js/js',
			'markdown/commonmark',
			'markdown/gfm',
		],
	},
};

export default config;
