const MESSAGE_ID = 'no-shorthand-property-overrides';
const messages = {
	[MESSAGE_ID]: 'The shorthand property `{{shorthand}}` overrides the previously declared `{{longhand}}` property.',
};

const shorthandProperties = new Map([
	['animation', 'animation-name animation-duration animation-timing-function animation-delay animation-iteration-count animation-direction animation-fill-mode animation-play-state'],
	['background', 'background-image background-size background-position background-repeat background-origin background-clip background-attachment background-color'],
	[
		'border',
		[
			'border-top-width',
			'border-right-width',
			'border-bottom-width',
			'border-left-width',
			'border-top-style',
			'border-right-style',
			'border-bottom-style',
			'border-left-style',
			'border-top-color',
			'border-right-color',
			'border-bottom-color',
			'border-left-color',
			'border-width',
			'border-style',
			'border-color',
			'border-image',
			'border-image-outset',
			'border-image-repeat',
			'border-image-slice',
			'border-image-source',
			'border-image-width',
		].join(' '),
	],
	['border-block', 'border-block-width border-block-style border-block-color'],
	['border-block-end', 'border-block-end-width border-block-end-style border-block-end-color'],
	['border-block-start', 'border-block-start-width border-block-start-style border-block-start-color'],
	['border-bottom', 'border-bottom-width border-bottom-style border-bottom-color'],
	['border-color', 'border-top-color border-right-color border-bottom-color border-left-color'],
	['border-image', 'border-image-source border-image-slice border-image-width border-image-outset border-image-repeat'],
	['border-inline', 'border-inline-width border-inline-style border-inline-color'],
	['border-inline-end', 'border-inline-end-width border-inline-end-style border-inline-end-color'],
	['border-inline-start', 'border-inline-start-width border-inline-start-style border-inline-start-color'],
	['border-left', 'border-left-width border-left-style border-left-color'],
	['border-radius', 'border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius'],
	['border-right', 'border-right-width border-right-style border-right-color'],
	['border-style', 'border-top-style border-right-style border-bottom-style border-left-style'],
	['border-top', 'border-top-width border-top-style border-top-color'],
	['border-width', 'border-top-width border-right-width border-bottom-width border-left-width'],
	['column-rule', 'column-rule-width column-rule-style column-rule-color'],
	['columns', 'column-width column-count'],
	['flex', 'flex-grow flex-shrink flex-basis'],
	['flex-flow', 'flex-direction flex-wrap'],
	[
		'font',
		[
			'font-style',
			'font-variant',
			'font-weight',
			'font-stretch',
			'font-size',
			'line-height',
			'font-family',
			'font-feature-settings',
			'font-kerning',
			'font-language-override',
			'font-optical-sizing',
			'font-size-adjust',
			'font-variant-alternates',
			'font-variant-caps',
			'font-variant-east-asian',
			'font-variant-emoji',
			'font-variant-ligatures',
			'font-variant-numeric',
			'font-variant-position',
			'font-variation-settings',
		].join(' '),
	],
	['font-synthesis', 'font-synthesis-weight font-synthesis-style font-synthesis-small-caps'],
	['font-variant', 'font-variant-ligatures font-variant-position font-variant-caps font-variant-numeric font-variant-alternates font-variant-east-asian font-variant-emoji'],
	['gap', 'row-gap column-gap'],
	['grid', 'grid-template-rows grid-template-columns grid-template-areas grid-auto-rows grid-auto-columns grid-auto-flow grid-column-gap grid-row-gap'],
	['grid-area', 'grid-row-start grid-column-start grid-row-end grid-column-end'],
	['grid-column', 'grid-column-start grid-column-end'],
	['grid-gap', 'grid-row-gap grid-column-gap'],
	['grid-row', 'grid-row-start grid-row-end'],
	['grid-template', 'grid-template-columns grid-template-rows grid-template-areas'],
	['inset', 'top right bottom left'],
	['inset-block', 'inset-block-start inset-block-end'],
	['inset-inline', 'inset-inline-start inset-inline-end'],
	['list-style', 'list-style-type list-style-position list-style-image'],
	['margin', 'margin-top margin-right margin-bottom margin-left'],
	['margin-block', 'margin-block-start margin-block-end'],
	['margin-inline', 'margin-inline-start margin-inline-end'],
	['mask', 'mask-image mask-mode mask-position mask-size mask-repeat mask-origin mask-clip mask-composite'],
	['outline', 'outline-color outline-style outline-width'],
	['overflow', 'overflow-x overflow-y'],
	['overscroll-behavior', 'overscroll-behavior-x overscroll-behavior-y'],
	['padding', 'padding-top padding-right padding-bottom padding-left'],
	['padding-block', 'padding-block-start padding-block-end'],
	['padding-inline', 'padding-inline-start padding-inline-end'],
	['place-content', 'align-content justify-content'],
	['place-items', 'align-items justify-items'],
	['place-self', 'align-self justify-self'],
	['scroll-margin', 'scroll-margin-top scroll-margin-right scroll-margin-bottom scroll-margin-left'],
	['scroll-margin-block', 'scroll-margin-block-start scroll-margin-block-end'],
	['scroll-margin-inline', 'scroll-margin-inline-start scroll-margin-inline-end'],
	['scroll-padding', 'scroll-padding-top scroll-padding-right scroll-padding-bottom scroll-padding-left'],
	['scroll-padding-block', 'scroll-padding-block-start scroll-padding-block-end'],
	['scroll-padding-inline', 'scroll-padding-inline-start scroll-padding-inline-end'],
	['text-decoration', 'text-decoration-line text-decoration-style text-decoration-color text-decoration-thickness'],
	['text-emphasis', 'text-emphasis-style text-emphasis-color'],
	['transition', 'transition-property transition-duration transition-timing-function transition-delay'],
].map(([shorthand, longhands]) => [shorthand, new Set(longhands.split(' '))]));

const getVendorPrefix = property => property.match(/^-\w+-/u)?.[0] ?? '';

/** @param {import('eslint').Rule.RuleContext} context */
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
			const longhandProperties = shorthandProperties.get(unprefixedProperty);

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

/** @type {import('eslint').Rule.RuleModule} */
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
