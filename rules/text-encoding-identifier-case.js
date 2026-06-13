import {replaceStringRaw} from './fix/index.js';
import {isMethodCall, isNewExpression} from './ast/index.js';

const MESSAGE_ID_ERROR = 'text-encoding-identifier/error';
const MESSAGE_ID_SUGGESTION = 'text-encoding-identifier/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const getReplacement = (encoding, withDash) => {
	switch (encoding.toLowerCase()) {
		// eslint-disable-next-line unicorn/text-encoding-identifier-case
		case 'utf-8':
		case 'utf8': {
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			return withDash ? 'utf-8' : 'utf8';
		}

		case 'ascii': {
			return 'ascii';
		}
		// No default
	}
};

// `fs.{readFile,readFileSync}()`
const isFsReadFileEncoding = node =>
	isMethodCall(node.parent, {
		methods: ['readFile', 'readFileSync'],
		optionalCall: false,
		optionalMember: false,
	})
	&& node.parent.arguments[1] === node
	&& node.parent.arguments[0].type !== 'SpreadElement';

const isJsxElementAttributes = (node, {element, attributes}) =>
	node.parent.type === 'JSXAttribute'
	&& node.parent.value === node
	&& node.parent.name.type === 'JSXIdentifier'
	&& attributes.includes(node.parent.name.name.toLowerCase())
	&& node.parent.parent.type === 'JSXOpeningElement'
	&& node.parent.parent.attributes.includes(node.parent)
	&& node.parent.parent.name.type === 'JSXIdentifier'
	&& node.parent.parent.name.name.toLowerCase() === element;

const shouldEnforceDash = node =>
	isJsxElementAttributes(node, {element: 'meta', attributes: ['charset']})
	|| isJsxElementAttributes(node, {element: 'form', attributes: ['acceptCharset', 'accept-charset'].map(attribute => attribute.toLowerCase())})
	|| (isNewExpression(node.parent, {name: 'TextDecoder'}) && node.parent.arguments[0] === node);

const getStringLiteralValue = node => {
	if (node.type === 'Literal') {
		if (typeof node.value !== 'string') {
			return;
		}

		return node.raw.slice(1, -1);
	}

	if (
		node.type === 'TemplateLiteral'
		&& node.parent.type !== 'TaggedTemplateExpression'
		&& node.expressions.length === 0
		&& node.quasis.length === 1
	) {
		return node.quasis[0].value.raw;
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0];

	context.on(['Literal', 'TemplateLiteral'], node => {
		const value = getStringLiteralValue(node);
		if (!value) {
			return;
		}

		const withDash = options.withDash || shouldEnforceDash(node);

		const replacement = getReplacement(value, withDash);
		if (!replacement || replacement === value) {
			return;
		}

		/** @param {import('eslint').Rule.RuleFixer} fixer */
		const fix = fixer => replaceStringRaw(node, replacement, context, fixer);

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				value,
				replacement,
			},
		};

		if (isFsReadFileEncoding(node)) {
			problem.fix = fix;
			return problem;
		}

		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix: fixer => replaceStringRaw(node, replacement, context, fixer),
			},
		];

		return problem;
	});

	// CSS @charset rule, e.g. `@charset "UTF-8";`
	// Note: `@eslint/css` AST nodes don't have parent references, so we listen on `Atrule`.
	context.on('Atrule', node => {
		if (node.name?.toLowerCase() !== 'charset') {
			return;
		}

		const stringNode = node.prelude?.children?.[0];
		if (!stringNode || stringNode.type !== 'String') {
			return;
		}

		const {value} = stringNode;
		// CSS @charset always uses the dash form per the CSS spec
		const replacement = getReplacement(value, true);
		if (!replacement || replacement === value) {
			return;
		}

		return {
			node: stringNode,
			messageId: MESSAGE_ID_ERROR,
			data: {value, replacement},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => replaceStringRaw(stringNode, replacement, context, fixer),
				},
			],
		};
	});

	// HTML <meta charset="..."> and <form accept-charset="...">
	// Listens on Tag nodes from @html-eslint — AttributeValue.range excludes the surrounding quotes.
	context.on('Tag', node => {
		const tagName = node.name?.toLowerCase();

		let attributeName;
		if (tagName === 'meta') {
			attributeName = 'charset';
		} else if (tagName === 'form') {
			attributeName = 'accept-charset';
		} else {
			return;
		}

		const attribute = node.attributes?.find(({type, key}) => type === 'Attribute' && key?.value?.toLowerCase() === attributeName);
		if (!attribute?.value) {
			return;
		}

		const {value} = attribute.value;
		// HTML charset attributes always use the dash form
		const replacement = getReplacement(value, true);
		if (!replacement || replacement === value) {
			return;
		}

		const [start, end] = context.sourceCode.getRange(attribute.value);
		return {
			node: attribute.value,
			messageId: MESSAGE_ID_ERROR,
			data: {value, replacement},
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceTextRange([start, end], replacement),
				},
			],
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			withDash: {
				type: 'boolean',
				description: 'Whether to prefer identifiers with a dash, like `utf-8` instead of `utf8`.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent case for text encoding identifiers.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{
			withDash: false,
		}],
		messages,
		languages: [
			'js/js',
			'css/css',
			'html/html',
		],
	},
};

export default config;
