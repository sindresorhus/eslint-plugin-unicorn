import {ident} from '@eslint/css-tree';

const MESSAGE_ID = 'no-unknown-animations';
const messages = {
	[MESSAGE_ID]: 'Unknown animation `{{name}}`.',
};

const animationProperties = new Set([
	'animation',
	'animation-name',
]);

const animationShorthandLonghandProperties = [
	'animation-duration',
	'animation-timing-function',
	'animation-delay',
	'animation-iteration-count',
	'animation-direction',
	'animation-fill-mode',
	'animation-play-state',
	'animation-timeline',
];

const keyframesNamePattern = /^(?:-(?:moz|o|webkit)-)?keyframes$/u;

const toAsciiLowerCase = string => string.replaceAll(/[A-Z]/g, character => character.toLowerCase());

const normalizeCssIdentifier = identifier => toAsciiLowerCase(ident.decode(identifier));

const getAnimationName = node => {
	if (node.type === 'Identifier') {
		return ident.decode(node.name);
	}

	if (node.type === 'String') {
		return node.value;
	}
};

const isAnimationNameNode = (node, lexer) => {
	const name = getAnimationName(node);
	if (name === undefined || name === '') {
		return false;
	}

	const matchResult = lexer.matchProperty('animation-name', node);
	return Boolean(matchResult.matched && matchResult.isType(node, 'keyframes-name'));
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

const getGroupAnimationNameNodes = (nodes, property, value, lexer) => {
	const matchResult = lexer.matchProperty(property, {...value, children: nodes});
	if (matchResult.matched) {
		return nodes.filter(node => getAnimationName(node) !== '' && matchResult.isType(node, 'keyframes-name'));
	}

	const animationNameNodes = nodes.filter(node => isAnimationNameNode(node, lexer));
	if (property === 'animation-name') {
		return animationNameNodes;
	}

	return animationNameNodes.filter(node =>
		animationShorthandLonghandProperties.every(longhandProperty => !lexer.matchProperty(longhandProperty, node).matched),
	);
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
	if (
		name === undefined
		|| name === ''
		|| (nameNode.type === 'Identifier' && normalizeCssIdentifier(nameNode.name) === 'none')
		|| !lexer.matchType('keyframes-name', nameNode).matched
	) {
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
	const definedAnimations = new Set();
	const usedAnimations = [];

	context.on('Atrule', atRule => {
		const name = getKeyframesName(atRule, lexer);
		if (name !== undefined) {
			definedAnimations.add(name);
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
			usedAnimations.push({
				node,
				name: getAnimationName(node),
			});
		}
	});

	context.onExit('StyleSheet', function * () {
		for (const {node, name} of usedAnimations) {
			if (!definedAnimations.has(name)) {
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
