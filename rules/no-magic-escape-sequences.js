import {isCallExpression, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';
import {
	checkVueTemplate,
	getModuleRelativeUrlArgument,
	getOutermostTypeScriptExpression,
	getTemplateElementRaw,
	isStringLiteralRequired,
	isTypeScriptDeclarationFile,
} from './utils/index.js';

const MESSAGE_ID = 'no-magic-escape-sequences';
const messages = {
	[MESSAGE_ID]: 'Extract `{{escape}}` into a named constant.',
};

// Consume other escapes too, so escaped backslashes never start a numeric escape.
const escapePattern = /(?<numeric>(?:\\(?:x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|\{[\dA-Fa-f]+\})))+)|\\(?:\r\n|.)/gsv;

const normalizeLineEndings = text => text.replaceAll(/\r\n?/g, '\n');

function shouldSkipString(node, expression, sourceCode) {
	const {parent} = expression;
	// TypeScript and bundlers can require literal paths for static analysis.
	return isStringLiteralRequired(node)
		|| (parent.type === 'ImportExpression' && parent.source === expression)
		|| (isCallExpression(parent, {name: 'require', argumentsLength: 1, optional: false}) && parent.arguments[0] === expression)
		|| getModuleRelativeUrlArgument(parent) === expression
		|| sourceCode.getAncestors(node).some(ancestor => ancestor.declare);
}

function isNamedConstantInitializer(expression) {
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
	// TypeScript can require literal initializers in declaration files.
	if (isTypeScriptDeclarationFile(context.filename)) {
		return;
	}

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
			const escape = match.groups.numeric;
			if (!escape) {
				continue;
			}

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
		if (!isStringLiteral(node)) {
			return;
		}

		const expression = getOutermostTypeScriptExpression(node);
		if (!shouldSkipString(node, expression, sourceCode)) {
			return getProblems(node, sourceCode.getText(node).slice(1, -1), node.raw.slice(1, -1), isNamedConstantInitializer(expression));
		}
	});

	context.on('TemplateLiteral', function * (node) {
		const expression = getOutermostTypeScriptExpression(node);
		if (isTaggedTemplateLiteral(node) || shouldSkipString(node, expression, sourceCode)) {
			return;
		}

		const isConstantInitializer = node.expressions.length === 0 && isNamedConstantInitializer(expression);
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
