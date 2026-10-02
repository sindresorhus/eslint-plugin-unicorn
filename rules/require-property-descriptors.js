import {ident} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

const MESSAGE_ID = 'require-property-descriptors';
const messages = {
	[MESSAGE_ID]: 'Missing required `{{descriptor}}` descriptor in `@property` rule.',
};

const universalSyntaxPattern = /^[\t\n\f\r ]*\*[\t\n\f\r ]*$/u;
const normalizeCssIdentifier = identifier => ident.decode(identifier).toLowerCase();

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Atrule', function * (atRule) {
		if (
			normalizeCssIdentifier(atRule.name) !== 'property'
			|| atRule.block?.type !== 'Block'
		) {
			return;
		}

		const descriptors = new Map();
		for (const declaration of atRule.block.children) {
			if (declaration.type === 'Declaration') {
				descriptors.set(normalizeCssIdentifier(declaration.property), declaration.value);
			}
		}

		const missingDescriptors = ['syntax', 'inherits'].filter(descriptor => !descriptors.has(descriptor));
		const syntax = descriptors.get('syntax');
		if (
			!descriptors.has('initial-value')
			&& syntax?.type === 'Value'
			&& syntax.children.length === 1
			&& syntax.children.at(0).type === 'String'
			&& !universalSyntaxPattern.test(syntax.children.at(0).value)
		) {
			missingDescriptors.push('initial-value');
		}

		const [start] = context.sourceCode.getRange(atRule);
		for (const descriptor of missingDescriptors) {
			yield {
				node: atRule,
				loc: toLocation([start, start + atRule.name.length + 1], context),
				messageId: MESSAGE_ID,
				data: {descriptor},
			};
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Require descriptors in CSS `@property` rules.',
			recommended: false,
		},
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
