import {getVendorPrefix, shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';

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
		const importantDeclarations = new Set();

		for (const declaration of block.children) {
			if (declaration.type !== 'Declaration') {
				continue;
			}

			const property = declaration.property.toLowerCase();
			const vendorPrefix = getVendorPrefix(property);
			const unprefixedProperty = property.slice(vendorPrefix.length);
			const longhandProperties = shorthandToAffectedProperties.get(unprefixedProperty);

			declarations.set(property, declaration.property);
			// A later normal declaration does not beat an `!important` one, including longhands set by an important shorthand.
			if (declaration.important) {
				importantDeclarations.add(property);
				for (const longhand of longhandProperties ?? []) {
					importantDeclarations.add(vendorPrefix + longhand);
				}
			}

			if (!longhandProperties) {
				continue;
			}

			for (const longhand of longhandProperties) {
				const original = declarations.get(vendorPrefix + longhand);

				// An `!important` declaration beats any normal one, whatever the source order is, so a normal shorthand does not override an `!important` longhand
				if (
					original
					&& (declaration.important || !importantDeclarations.has(vendorPrefix + longhand))
				) {
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
			'css/css',
		],
	},
};

export default config;
