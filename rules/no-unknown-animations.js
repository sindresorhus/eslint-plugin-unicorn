import {ident} from '@eslint/css-tree';

const MESSAGE_ID = 'no-unknown-animations';
const messages = {
	[MESSAGE_ID]: 'Unknown animation `{{name}}`.',
};

const animationProperties = new Set([
	'animation',
	'animation-name',
]);

const animationShorthandComponents = [
	{property: 'animation-duration'},
	{property: 'animation-timing-function', type: 'easing-function'},
	{property: 'animation-delay'},
	{property: 'animation-iteration-count', type: 'single-animation-iteration-count'},
	{property: 'animation-direction', type: 'single-animation-direction'},
	{property: 'animation-fill-mode', type: 'single-animation-fill-mode'},
	{property: 'animation-play-state', type: 'single-animation-play-state'},
	{property: 'animation-timeline', type: 'single-animation-timeline'},
];

const keyframesNamePattern = /^(?:-(?:moz|o|webkit)-)?keyframes$/u;

const toAsciiLowerCase = string => string.replaceAll(/[A-Z]/g, character => character.toLowerCase());

const normalizeCssIdentifier = identifier => toAsciiLowerCase(ident.decode(identifier));

// The lexer does not consistently recognize escaped keyword, function, or unit spellings.
const getCanonicalLexerNode = node => {
	let canonicalNode = node;
	if (node.type === 'Identifier' || node.type === 'Function') {
		canonicalNode = {...node, name: ident.encode(ident.decode(node.name))};
	} else if (node.type === 'Dimension') {
		canonicalNode = {...node, unit: ident.encode(ident.decode(node.unit))};
	}

	if (node.children) {
		canonicalNode = {
			...canonicalNode,
			children: node.children.map(child => getCanonicalLexerNode(child)),
		};
	}

	return canonicalNode;
};

const getAnimationName = node => {
	if (node.type === 'Identifier') {
		return ident.decode(node.name);
	}

	if (node.type === 'String') {
		return node.value;
	}
};

const isAnimationNameNode = (node, property, lexer) => {
	const name = getAnimationName(node);
	if (name === undefined || name === '') {
		return false;
	}

	const canonicalNode = getCanonicalLexerNode(node);
	const matchResult = lexer.matchProperty(property, canonicalNode);
	return Boolean(matchResult.matched && matchResult.isType(canonicalNode, 'keyframes-name'));
};

const getCommaSeparatedGroups = value => {
	const groups = [[]];

	for (const node of value.children) {
		if (node.type === 'Operator' && node.value === ',') {
			groups.push([]);
			continue;
		}

		groups.at(-1).push(node);
	}

	return groups;
};

const isShorthandComponentNode = (node, component, matchResult) => component.type
	? matchResult.isType(node, component.type)
	: matchResult.isProperty(node, component.property);

const isAnimationNameByShorthandOrder = (index, nodes, matchResult, lexer) => {
	const node = nodes[index];
	const previousNodes = nodes.slice(0, index);
	return animationShorthandComponents.every(component =>
		!lexer.matchProperty(component.property, node).matched
		|| previousNodes.some(previousNode => isShorthandComponentNode(previousNode, component, matchResult)),
	);
};

const getGroupAnimationNameNodes = (nodes, property, value, lexer) => {
	const canonicalNodes = nodes.map(node => getCanonicalLexerNode(node));
	const matchResult = lexer.matchProperty(property, {...value, children: canonicalNodes});
	if (matchResult.matched) {
		const animationNameIndex = canonicalNodes.findIndex((node, index) => getAnimationName(nodes[index]) !== '' && matchResult.isType(node, 'keyframes-name'));
		if (animationNameIndex === -1) {
			return [];
		}

		if (
			property === 'animation-name'
			|| isAnimationNameByShorthandOrder(
				animationNameIndex,
				canonicalNodes,
				matchResult,
				lexer,
			)
		) {
			return [nodes[animationNameIndex]];
		}
	}

	return nodes.filter(node => isAnimationNameNode(node, property, lexer));
};

const getAnimationNameNodes = (declaration, property, lexer) => getCommaSeparatedGroups(declaration.value)
	.flatMap(nodes => getGroupAnimationNameNodes(nodes, property, declaration.value, lexer));

const getKeyframesName = (atRule, lexer) => {
	if (
		!keyframesNamePattern.test(normalizeCssIdentifier(atRule.name))
		|| atRule.prelude?.type !== 'AtrulePrelude'
		|| atRule.block?.type !== 'Block'
		|| atRule.prelude.children.length !== 1
	) {
		return;
	}

	const [nameNode] = atRule.prelude.children;
	const name = getAnimationName(nameNode);
	if (!isAnimationNameNode(nameNode, 'animation-name', lexer)) {
		return;
	}

	return name;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {lexer} = sourceCode;
	const definedAnimationNames = new Set();
	const animationNameReferences = [];

	context.on('Atrule', atRule => {
		const name = getKeyframesName(atRule, lexer);
		if (name !== undefined) {
			definedAnimationNames.add(name);
		}
	});

	context.on('Declaration', declaration => {
		const property = normalizeCssIdentifier(declaration.property);
		if (
			!animationProperties.has(property)
			|| declaration.value.type !== 'Value'
			|| sourceCode.getParent(declaration)?.type !== 'Block'
		) {
			return;
		}

		for (const node of getAnimationNameNodes(declaration, property, lexer)) {
			animationNameReferences.push({
				node,
				name: getAnimationName(node),
			});
		}
	});

	context.onExit('StyleSheet', function * () {
		for (const {node, name} of animationNameReferences) {
			if (!definedAnimationNames.has(name)) {
				yield {
					node,
					messageId: MESSAGE_ID,
					data: {name},
				};
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
			description: 'Disallow unknown animations.',
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
