const MESSAGE_ID_ERROR = 'prefer-explicit-viewport-units/error';
const MESSAGE_ID_SUGGESTION = 'prefer-explicit-viewport-units/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const sizeProperties = new Set([
	'height',
	'min-height',
	'max-height',
	'width',
	'min-width',
	'max-width',
	'block-size',
	'min-block-size',
	'max-block-size',
	'inline-size',
	'min-inline-size',
	'max-inline-size',
]);

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			unit: {
				enum: ['dvh', 'svh', 'lvh'],
				description: 'The viewport height unit to prefer.',
			},
		},
	},
];

const getDeclaration = (node, sourceCode) => {
	let currentNode = node;

	while (currentNode) {
		if (currentNode.type === 'Declaration') {
			return currentNode;
		}

		currentNode = sourceCode.getParent(currentNode);
	}
};

const isSizeDeclaration = (node, sourceCode) => {
	const declaration = getDeclaration(node, sourceCode);

	return declaration
		&& sizeProperties.has(declaration.property.toLowerCase())
		&& sourceCode.getParent(declaration).type !== 'SupportsDeclaration';
};

const getReplacement = (unit, preferredUnit) => `${preferredUnit.slice(0, -1)}${unit.at(-1)}`;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const [{unit: preferredUnit}] = context.options;

	context.on('Dimension', node => {
		const unit = node.unit.toLowerCase();
		if (
			(unit !== 'vh' && unit !== 'vw')
			|| Number(node.value) !== 100
			|| !isSizeDeclaration(node, context.sourceCode)
		) {
			return;
		}

		const replacement = getReplacement(unit, preferredUnit);
		const value = `${node.value}${node.unit}`;

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {value, replacement: `${node.value}${replacement}`},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: {value, replacement: `${node.value}${replacement}`},
					fix: fixer => fixer.replaceText(node, `${node.value}${replacement}`),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer explicit viewport units.',
			recommended: false,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{unit: 'dvh'}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
