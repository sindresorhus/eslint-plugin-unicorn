import {
	isFunction,
	isMemberExpression,
	isMethodCall,
	isStringLiteral,
} from './ast/index.js';
import {unwrapExpression} from './utils/comparison.js';
import {
	getConstVariableInitializer,
	isKnownNonString,
} from './utils/index.js';

const MESSAGE_ID = 'no-unsafe-string-replacement';
const messages = {
	[MESSAGE_ID]: 'Do not use a non-literal replacement value with `String#{{method}}()`.',
};

const isStaticTemplateLiteral = node =>
	node.type === 'TemplateLiteral'
	&& node.expressions.length === 0;

const isStaticStringRawTaggedTemplate = (node, sourceCode) =>
	node.type === 'TaggedTemplateExpression'
	&& isStaticTemplateLiteral(node.quasi)
	&& isMemberExpression(node.tag, {
		object: 'String',
		property: 'raw',
		optional: false,
	})
	&& sourceCode.isGlobalReference(node.tag.object);

const isAllowedReplacement = (node, sourceCode) => {
	node = unwrapExpression(node);

	return isStringLiteral(node)
		|| isStaticTemplateLiteral(node)
		|| isStaticStringRawTaggedTemplate(node, sourceCode)
		|| isFunction(node);
};

const objectCoercionPropertyNames = new Set([
	'__proto__',
	'toString',
	'valueOf',
]);

const isPlainObjectReplacement = (node, context) => {
	node = unwrapExpression(node);
	const replacement = unwrapExpression(getConstVariableInitializer(node, context) ?? node);

	return replacement.type === 'ObjectExpression'
		&& replacement.properties.every(property =>
			property.type === 'Property'
			&& !property.computed
			&& !property.method
			&& property.kind === 'init'
			&& !objectCoercionPropertyNames.has(property.key.name ?? property.key.value));
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			methods: ['replace', 'replaceAll'],
			argumentsLength: 2,
		})) {
			return;
		}

		const [, replacement] = node.arguments;
		if (isAllowedReplacement(replacement, context.sourceCode)) {
			return;
		}

		if (isPlainObjectReplacement(replacement, context)) {
			return;
		}

		if (isKnownNonString(node.callee.object, context)) {
			return;
		}

		return {
			node: replacement,
			messageId: MESSAGE_ID,
			data: {
				method: node.callee.property.name,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-literal replacement values in `String#replace()` and `String#replaceAll()`.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
