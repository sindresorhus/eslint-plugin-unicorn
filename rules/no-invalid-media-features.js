import {ident, keyword} from '@eslint/css-tree';

const MESSAGE_ID_UNKNOWN = 'no-invalid-media-features/unknown';
const MESSAGE_ID_INVALID_VALUE = 'no-invalid-media-features/invalid-value';
const messages = {
	[MESSAGE_ID_UNKNOWN]: 'Unknown media feature `{{name}}`.',
	[MESSAGE_ID_INVALID_VALUE]: 'Invalid value `{{value}}` for media feature `{{name}}`. Expected {{expected}}.',
};

const rangeMediaFeatureSyntaxes = [
	['aspect-ratio', '<ratio>'],
	['color', '<integer>'],
	['color-index', '<integer>'],
	['device-aspect-ratio', '<ratio>'],
	['device-height', '<length>'],
	['device-width', '<length>'],
	['height', '<length>'],
	['horizontal-viewport-segments', '<integer>'],
	['monochrome', '<integer>'],
	['resolution', '<resolution> | infinite'],
	['vertical-viewport-segments', '<integer>'],
	['width', '<length>'],
];

const mediaFeatureSyntaxes = new Map([
	...rangeMediaFeatureSyntaxes,
	['any-hover', 'none | hover'],
	['any-pointer', 'none | coarse | fine'],
	['color-gamut', 'srgb | p3 | rec2020'],
	['device-posture', 'continuous | folded'],
	['display-state', 'normal | minimized | maximized | fullscreen'],
	['display-mode', 'fullscreen | standalone | minimal-ui | browser | picture-in-picture | window-controls-overlay'],
	['dynamic-range', 'standard | high'],
	['environment-blending', 'opaque | additive | subtractive'],
	['forced-colors', 'none | active'],
	['grid', '0 | 1'],
	['hover', 'none | hover'],
	['inverted-colors', 'none | inverted'],
	['nav-controls', 'none | back'],
	['orientation', 'portrait | landscape'],
	['overflow-block', 'none | scroll | paged'],
	['overflow-inline', 'none | scroll'],
	['pointer', 'none | coarse | fine'],
	['prefers-color-scheme', 'light | dark'],
	['prefers-contrast', 'no-preference | less | more | custom'],
	['prefers-reduced-data', 'no-preference | reduce'],
	['prefers-reduced-motion', 'no-preference | reduce'],
	['prefers-reduced-transparency', 'no-preference | reduce'],
	['resizable', 'true | false'],
	['scan', 'interlace | progressive'],
	['scripting', 'none | initial-only | enabled'],
	['shape', 'rect | round'],
	['ua-color-scheme', 'light | dark'],
	['update', 'none | slow | fast'],
	['video-color-gamut', 'srgb | p3 | rec2020'],
	['video-dynamic-range', 'standard | high'],
]);

for (const [name, syntax] of rangeMediaFeatureSyntaxes) {
	mediaFeatureSyntaxes.set(`min-${name}`, syntax);
	mediaFeatureSyntaxes.set(`max-${name}`, syntax);
}

const getFeatureNameDescriptor = name => keyword(ident.decode(name));

const isIgnoredFeatureName = name => Boolean(name.custom || name.vendor);

function getEnvironmentFunctions(node, functions = []) {
	if (node.type === 'Function' && ident.decode(node.name).toLowerCase() === 'env') {
		functions.push(node);
		return functions;
	}

	for (const child of node.children ?? []) {
		getEnvironmentFunctions(child, functions);
	}

	return functions;
}

function getEnvironmentPlaceholder(syntax) {
	switch (syntax) {
		case '<length>': {
			return '0px';
		}

		case '<integer>': {
			return '0';
		}

		case '<ratio>': {
			return '1 / 1';
		}

		case '<resolution> | infinite': {
			return '1dppx';
		}

		default: {
			return syntax.split(' | ', 1)[0];
		}
	}
}

function getValueWithEnvironmentPlaceholders(sourceCode, node, syntax) {
	const environmentFunctions = getEnvironmentFunctions(node);
	if (environmentFunctions.length === 0) {
		return;
	}

	const nodeStartOffset = sourceCode.getLoc(node).start.offset;
	const placeholder = getEnvironmentPlaceholder(syntax);
	let value = sourceCode.getText(node);

	for (const functionNode of environmentFunctions.toReversed()) {
		const startOffset = sourceCode.getLoc(functionNode).start.offset - nodeStartOffset;
		const endOffset = sourceCode.getLoc(functionNode).end.offset - nodeStartOffset;
		value = value.slice(0, startOffset) + placeholder + value.slice(endOffset);
	}

	return value;
}

function getFeatureNameLocation(node, sourceCode) {
	const nodeText = sourceCode.getText(node);
	let index = 0;

	while (index < nodeText.length) {
		if (nodeText[index] === '(' || nodeText[index].trim() === '') {
			index++;
			continue;
		}

		if (nodeText.startsWith('/*', index)) {
			index = nodeText.indexOf('*/', index + 2) + 2;
			continue;
		}

		break;
	}

	const startOffset = sourceCode.getLoc(node).start.offset + index;

	return {
		start: sourceCode.getLocFromIndex(startOffset),
		end: sourceCode.getLocFromIndex(startOffset + node.name.length),
	};
}

function getUnknownFeatureProblem(node, name, sourceCode) {
	return {
		node,
		loc: node.type === 'Feature' ? getFeatureNameLocation(node, sourceCode) : sourceCode.getLoc(node),
		messageId: MESSAGE_ID_UNKNOWN,
		data: {name},
	};
}

function getInvalidValueProblem(sourceCode, node, name, syntax) {
	const {error} = sourceCode.lexer.match(syntax, node);
	const valueWithEnvironmentPlaceholders = error && getValueWithEnvironmentPlaceholders(sourceCode, node, syntax);

	if (!error || (valueWithEnvironmentPlaceholders && !sourceCode.lexer.match(syntax, valueWithEnvironmentPlaceholders).error)) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID_INVALID_VALUE,
		data: {
			name,
			value: sourceCode.getText(node),
			expected: syntax,
		},
	};
}

function getRangeFeatureNameNode(node) {
	const identifierNodes = [node.left, node.middle].filter(node => node.type === 'Identifier');

	return identifierNodes.find(node => mediaFeatureSyntaxes.has(getFeatureNameDescriptor(node.name).name))
		?? identifierNodes.find(node => isIgnoredFeatureName(getFeatureNameDescriptor(node.name)))
		?? identifierNodes[0];
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('Feature', node => {
		if (node.kind !== 'media') {
			return;
		}

		const featureName = getFeatureNameDescriptor(node.name);
		if (isIgnoredFeatureName(featureName)) {
			return;
		}

		const syntax = mediaFeatureSyntaxes.get(featureName.name);
		if (!syntax) {
			return getUnknownFeatureProblem(node, node.name, sourceCode);
		}

		if (node.value) {
			return getInvalidValueProblem(sourceCode, node.value, node.name, syntax);
		}
	});

	context.on('FeatureRange', function * (node) {
		if (node.kind !== 'media') {
			return;
		}

		const nameNode = getRangeFeatureNameNode(node);
		if (!nameNode) {
			return;
		}

		const featureName = getFeatureNameDescriptor(nameNode.name);
		if (isIgnoredFeatureName(featureName)) {
			return;
		}

		const syntax = mediaFeatureSyntaxes.get(featureName.name);
		if (!syntax) {
			yield getUnknownFeatureProblem(nameNode, nameNode.name, sourceCode);
			return;
		}

		for (const valueNode of [node.left, node.middle, node.right]) {
			if (!valueNode || valueNode === nameNode) {
				continue;
			}

			const problem = getInvalidValueProblem(sourceCode, valueNode, nameNode.name, syntax);
			if (problem) {
				yield problem;
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
			description: 'Disallow unknown media features and invalid values for known media features.',
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
