import {isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';
import {
	checkVueTemplate,
	getOutermostTypeScriptExpression,
	getTemplateElementRaw,
	isStringLiteralRequired,
} from './utils/index.js';

const MESSAGE_ID = 'no-magic-escape-sequences';
const messages = {
	[MESSAGE_ID]: 'Extract `{{escape}}` into a named constant.',
};

// Consume other escapes too, so escaped backslashes never start a numeric escape.
const escapePattern = /\\(?:(?<numeric>x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|\{[\dA-Fa-f]+\}))|\r\n|.)/gsv;

const normalizeLineEndings = text => text.replaceAll(/\r\n?/g, '\n');

function isNamedConstantInitializer(node) {
	const expression = getOutermostTypeScriptExpression(node);
	const {parent} = expression;
	return parent.type === 'VariableDeclarator'
		&& parent.init === expression
		&& parent.id.type === 'Identifier'
		&& parent.parent.kind === 'const';
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	function * getProblems(node, raw, parsedRaw, isConstantInitializer) {
		// The Vue.js parser can decode HTML character references before parsing the expression, changing source offsets.
		if (normalizeLineEndings(raw) !== normalizeLineEndings(parsedRaw)) {
			return;
		}

		const escapes = raw.matchAll(escapePattern).toArray();

		if (isConstantInitializer && escapes.map(match => match[0]).join('') === raw) {
			return;
		}

		const rawStart = sourceCode.getRange(node)[0] + 1;
		for (const match of escapes) {
			if (!match.groups.numeric) {
				continue;
			}

			const [escape] = match;
			const start = rawStart + match.index;
			yield {
				node,
				loc: {
					start: sourceCode.getLocFromIndex(start),
					end: sourceCode.getLocFromIndex(start + escape.length),
				},
				messageId: MESSAGE_ID,
				data: {escape},
			};
		}
	}

	context.on('Literal', node => {
		if (isStringLiteral(node) && !isStringLiteralRequired(node)) {
			return getProblems(node, sourceCode.getText(node).slice(1, -1), node.raw.slice(1, -1), isNamedConstantInitializer(node));
		}
	});

	context.on('TemplateLiteral', function * (node) {
		if (isTaggedTemplateLiteral(node) || isStringLiteralRequired(node)) {
			return;
		}

		const isConstantInitializer = node.expressions.length === 0 && isNamedConstantInitializer(node);
		for (const quasi of node.quasis) {
			yield * getProblems(quasi, getTemplateElementRaw(quasi, context), quasi.value.raw, isConstantInitializer);
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require names for numeric escape sequences in strings.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
