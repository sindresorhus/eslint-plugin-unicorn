const splitProperties = properties => properties.split(' ');

const shorthandEntries = [
	[
		'animation',
		'animation-duration animation-timing-function animation-delay animation-iteration-count animation-direction animation-fill-mode animation-play-state animation-name animation-timeline',
		'animation-range',
	],
	['animation-range', 'animation-range-start animation-range-end'],
	['background', 'background-image background-position background-size background-repeat background-attachment background-origin background-clip background-color'],
	['border', 'border-width border-style border-color', 'border-image'],
	['border-block', 'border-block-width border-block-style border-block-color'],
	['border-block-color', 'border-block-start-color border-block-end-color'],
	['border-block-end', 'border-block-end-width border-block-end-style border-block-end-color'],
	['border-block-start', 'border-block-start-width border-block-start-style border-block-start-color'],
	['border-block-style', 'border-block-start-style border-block-end-style'],
	['border-block-width', 'border-block-start-width border-block-end-width'],
	['border-bottom', 'border-bottom-width border-bottom-style border-bottom-color'],
	['border-color', 'border-top-color border-right-color border-bottom-color border-left-color'],
	['border-image', 'border-image-source border-image-slice border-image-width border-image-outset border-image-repeat'],
	['border-inline', 'border-inline-width border-inline-style border-inline-color'],
	['border-inline-color', 'border-inline-start-color border-inline-end-color'],
	['border-inline-end', 'border-inline-end-width border-inline-end-style border-inline-end-color'],
	['border-inline-start', 'border-inline-start-width border-inline-start-style border-inline-start-color'],
	['border-inline-style', 'border-inline-start-style border-inline-end-style'],
	['border-inline-width', 'border-inline-start-width border-inline-end-width'],
	['border-left', 'border-left-width border-left-style border-left-color'],
	['border-radius', 'border-top-left-radius border-top-right-radius border-bottom-right-radius border-bottom-left-radius'],
	['border-right', 'border-right-width border-right-style border-right-color'],
	['border-style', 'border-top-style border-right-style border-bottom-style border-left-style'],
	['border-top', 'border-top-width border-top-style border-top-color'],
	['border-width', 'border-top-width border-right-width border-bottom-width border-left-width'],
	['column-rule', 'column-rule-width column-rule-style column-rule-color'],
	['columns', 'column-width column-count column-height'],
	['flex', 'flex-grow flex-shrink flex-basis'],
	['flex-flow', 'flex-direction flex-wrap'],
	[
		'font',
		'font-style font-variant font-weight font-stretch font-size line-height font-family',
		'font-feature-settings font-kerning font-language-override font-optical-sizing font-size-adjust font-variation-settings',
	],
	['font-synthesis', 'font-synthesis-weight font-synthesis-style font-synthesis-small-caps font-synthesis-position'],
	['font-variant', 'font-variant-ligatures font-variant-position font-variant-caps font-variant-numeric font-variant-alternates font-variant-east-asian font-variant-emoji'],
	['gap', 'row-gap column-gap'],
	['grid', 'grid-template-rows grid-template-columns grid-template-areas grid-auto-rows grid-auto-columns grid-auto-flow'],
	['grid-area', 'grid-row-start grid-column-start grid-row-end grid-column-end'],
	['grid-column', 'grid-column-start grid-column-end'],
	['grid-gap', 'grid-row-gap grid-column-gap'],
	['grid-row', 'grid-row-start grid-row-end'],
	['grid-template', 'grid-template-rows grid-template-columns grid-template-areas'],
	['inset', 'top right bottom left'],
	['inset-block', 'inset-block-start inset-block-end'],
	['inset-inline', 'inset-inline-start inset-inline-end'],
	['list-style', 'list-style-type list-style-position list-style-image'],
	['margin', 'margin-top margin-right margin-bottom margin-left'],
	['margin-block', 'margin-block-start margin-block-end'],
	['margin-inline', 'margin-inline-start margin-inline-end'],
	['mask', 'mask-image mask-position mask-size mask-repeat mask-origin mask-clip mask-composite mask-mode', 'mask-border'],
	['mask-border', 'mask-border-source mask-border-slice mask-border-width mask-border-outset mask-border-repeat mask-border-mode'],
	['outline', 'outline-width outline-style outline-color'],
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
	['transition', 'transition-property transition-duration transition-timing-function transition-delay transition-behavior'],
];

const shorthandProperties = new Map(shorthandEntries.map(([shorthand, components, resetProperties = '']) => [shorthand, {
	components: splitProperties(components),
	resetProperties: resetProperties ? splitProperties(resetProperties) : [],
}]));

// Follow the shared catalog's components and reset-only properties, including nested shorthands.
const getAffectedProperties = shorthand => {
	const affectedProperties = new Set();

	const addProperties = properties => {
		for (const property of properties) {
			affectedProperties.add(property);
			const nestedShorthand = shorthandProperties.get(property);
			if (nestedShorthand) {
				addProperties([...nestedShorthand.components, ...nestedShorthand.resetProperties]);
			}
		}
	};

	const definition = shorthandProperties.get(shorthand);
	if (definition) {
		addProperties([...definition.components, ...definition.resetProperties]);
	}

	return affectedProperties;
};

const shorthandToAffectedProperties = new Map(shorthandProperties.keys().map(shorthand => [shorthand, getAffectedProperties(shorthand)]));

// Include affected properties even when combining their longhands is not supported by the shorthand serializers.
const additionalAffectedPropertyEntries = [
	// `animation` does not reset `animation-composition`: https://drafts.csswg.org/css-animations-2/#animation
	['animation', 'animation-trigger'],
	// Missing shorthand metadata: https://drafts.csswg.org/css-backgrounds-4/#propdef-background-repeat
	['background', 'background-repeat-x background-repeat-y'],
	['background-repeat', 'background-repeat-x background-repeat-y'],
	// https://drafts.csswg.org/css-ui-4/#propdef-caret
	['caret', 'caret-color caret-animation caret-shape'],
	// https://drafts.csswg.org/css-anchor-position-1/#propdef-position-try
	['position-try', 'position-try-order position-try-fallbacks'],
	// Omit the unimplemented `text-align` shorthand: https://drafts.csswg.org/css-text-4/#propdef-text-align
	// Missing from Webref shorthand metadata: https://drafts.csswg.org/css-inline-3/#propdef-text-box
	['text-box', 'text-box-trim text-box-edge'],
	// https://drafts.csswg.org/css-text-decor-4/#propdef-text-decoration-skip
	['text-decoration-skip', 'text-decoration-skip-self text-decoration-skip-box text-decoration-skip-spaces text-decoration-skip-ink'],
	// https://drafts.csswg.org/css-text-4/#propdef-text-wrap
	['text-wrap', 'text-wrap-mode text-wrap-style'],
	// https://drafts.csswg.org/css-text-4/#propdef-white-space
	['white-space', 'white-space-collapse text-wrap-mode white-space-trim'],
];

for (const [shorthand, properties] of additionalAffectedPropertyEntries) {
	shorthandToAffectedProperties.set(shorthand, new Set([
		...shorthandToAffectedProperties.get(shorthand) ?? [],
		...splitProperties(properties),
	]));
}

const getVendorPrefix = property => property.match(/^-\w+-/u)?.[0] ?? '';

export {
	getVendorPrefix,
	shorthandProperties,
	shorthandToAffectedProperties,
};
