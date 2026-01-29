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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = context.options[0];

	context.on('Literal', node => {
		if (typeof node.value !== 'string') {
			return;
		}

		const withDash = options.withDash || shouldEnforceDash(node);

		const {raw} = node;
		const value = raw.slice(1, -1);

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
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			withDash: {
				type: 'boolean',
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
	},
};

export default config;
