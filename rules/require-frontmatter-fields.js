import {
	isAlias,
	isMap,
	isScalar,
	parseDocument,
} from 'yaml';

const MESSAGE_ID_MISSING_FIELD = 'missing-field';
const MESSAGE_ID_INVALID_TYPE = 'invalid-type';
const messages = {
	[MESSAGE_ID_MISSING_FIELD]: 'Missing required frontmatter field `{{field}}`.',
	[MESSAGE_ID_INVALID_TYPE]: 'Frontmatter field `{{field}}` must be a `{{type}}`.',
};

const primitiveTypes = [
	'string',
	'number',
	'boolean',
	'null',
];

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
			types: {
				type: 'object',
				additionalProperties: {
					enum: primitiveTypes,
				},
				description: 'Expected primitive types for top-level YAML frontmatter fields.',
			},
		},
	},
];

function getValueType(value, document) {
	if (isAlias(value)) {
		value = value.resolve(document);
	}

	if (value === null) {
		return 'null';
	}

	if (!isScalar(value)) {
		return 'object';
	}

	return value.value === null ? 'null' : typeof value.value;
}

function getFieldPairs(document) {
	if (!isMap(document.contents)) {
		return new Map();
	}

	return new Map(document.contents.items
		.filter(pair => isScalar(pair.key) && typeof pair.key.value === 'string')
		.map(pair => [pair.key.value, pair]));
}

function getFrontmatterContentStart(node, sourceCode) {
	const [nodeStart, nodeEnd] = sourceCode.getRange(node);
	const nodeText = sourceCode.text.slice(nodeStart, nodeEnd);
	const lineEnding = /\r\n?|\n/u.exec(nodeText);

	return nodeStart + lineEnding.index + lineEnding[0].length;
}

function getValueLocation(node, pair, sourceCode) {
	const range = Reflect.get(pair.value ?? pair.key, 'range');
	const frontmatterContentStart = getFrontmatterContentStart(node, sourceCode);
	const start = frontmatterContentStart + range[0];
	const end = frontmatterContentStart + range[1];

	return {
		start: sourceCode.getLocFromIndex(start),
		end: sourceCode.getLocFromIndex(end),
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {fields, types} = context.options[0];

	if (fields.length === 0 && Object.keys(types).length === 0) {
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

		const fieldPairs = getFieldPairs(document);

		for (const field of fields) {
			if (fieldPairs.has(field)) {
				continue;
			}

			yield {
				node,
				messageId: MESSAGE_ID_MISSING_FIELD,
				data: {field},
			};
		}

		for (const [field, type] of Object.entries(types)) {
			const pair = fieldPairs.get(field);

			if (!pair || getValueType(pair.value, document) === type) {
				continue;
			}

			yield {
				node,
				loc: getValueLocation(node, pair, context.sourceCode),
				messageId: MESSAGE_ID_INVALID_TYPE,
				data: {field, type},
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
		defaultOptions: [{fields: [], types: {}}],
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
