import {getVendorPrefix, shorthandToLonghandProperties} from './shared/css-shorthand-properties.js';

const MESSAGE_ID = 'no-shorthand-property-overrides';
const messages = {
	[MESSAGE_ID]: 'The shorthand property `{{shorthand}}` overrides the previously declared `{{longhand}}` property.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Block', function * (block) {
		const declarations = new Map();

		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const property = declaration.property.toLowerCase();
			const vendorPrefix = getVendorPrefix(property);
			const unprefixedProperty = property.slice(vendorPrefix.length);
			const longhandProperties = shorthandToLonghandProperties.get(unprefixedProperty);

			declarations.set(property, declaration.property);

			if (!longhandProperties) {
				continue;
			}

			for (const longhand of longhandProperties) {
				const original = declarations.get(vendorPrefix + longhand);

				if (original) {
					yield {
						node: declaration,
						messageId: MESSAGE_ID,
						data: {
							shorthand: declaration.property,
							longhand: original,
						},
					};
				}
			}
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
			description: 'Disallow shorthand properties that override related longhand properties.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
			'css/css',
		],
	},
};

export default config;
