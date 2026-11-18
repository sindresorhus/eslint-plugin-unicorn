import {isCallExpression, isStringLiteral, isTaggedTemplateLiteral} from './ast/index.js';
import {
	checkVueTemplate,
	getModuleRelativeUrlArgument,
	getOutermostTypeScriptExpression,
	getTemplateElementRaw,
	isStringLiteralRequired,
	isTypeScriptDeclarationFile,
	toLocation,
} from './utils/index.js';

const MESSAGE_ID = 'no-magic-escape-sequences';
const messages = {
	[MESSAGE_ID]: 'Extract `{{escape}}` into a named constant.',
};

// Consume other escapes too, so escaped backslashes never start a numeric escape.
const stringEscapePattern = /(?<numeric>(?:\\(?:x[\dA-Fa-f]{2}|u(?:[\dA-Fa-f]{4}|\{[\dA-Fa-f]+\})))+)|\\(?:\r\n|.)/gsv;

// Espree reads at most ten characters after the ampersand, including the semicolon.
const jsxReferencePattern = /&#(?:x(?<hexadecimal>[\dA-Fa-f]{1,7})|(?<decimal>\d{1,8}));/gv;

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

	function getEscapeProblem(node, escape, start) {
		return {
			node,
			loc: toLocation([start, start + escape.length], context),
			messageId: MESSAGE_ID,
			data: {escape},
		};
	}

	function * getJsxProblems(node) {
		const raw = sourceCode.getText(node);
		// Vue can decode character references before parsing JSX in a template expression.
		if (node.raw !== undefined && normalizeLineEndings(raw) !== normalizeLineEndings(node.raw)) {
			return;
		}

		const [rawStart] = sourceCode.getRange(node);
		// Escaping these delimiters is part of JSX syntax.
		const delimiters = node.type === 'JSXText' ? '<>{}' : raw[0];
		for (const match of raw.matchAll(jsxReferencePattern)) {
			const {hexadecimal, decimal} = match.groups;
			const codePoint = hexadecimal === undefined ? Number(decimal) : Number.parseInt(hexadecimal, 16);
			if (codePoint <= 0x10_FF_FF && !delimiters.includes(String.fromCodePoint(codePoint))) {
				yield getEscapeProblem(node, match[0], rawStart + match.index);
			}
		}
	}

	function * getStringProblems(node, raw, parsedRaw, isConstantInitializer) {
		// The Vue.js parser can decode HTML character references before parsing the expression, changing source offsets.
		if (normalizeLineEndings(raw) !== normalizeLineEndings(parsedRaw)) {
			return;
		}

		const escapes = raw.matchAll(stringEscapePattern).toArray();

		if (isConstantInitializer && escapes.map(match => match[0]).join('') === raw) {
			return;
		}

		const rawStart = sourceCode.getRange(node)[0] + 1;
		for (const match of escapes) {
			const escape = match.groups.numeric;
			if (!escape) {
				continue;
			}

			yield getEscapeProblem(node, escape, rawStart + match.index);
		}
	}

	context.on('JSXText', getJsxProblems);

	context.on('Literal', node => {
		if (!isStringLiteral(node)) {
			return;
		}

		if (node.parent.type === 'JSXAttribute') {
			return getJsxProblems(node);
		}

		const expression = getOutermostTypeScriptExpression(node);
		if (!shouldSkipString(node, expression, sourceCode)) {
			return getStringProblems(node, sourceCode.getText(node).slice(1, -1), node.raw.slice(1, -1), isNamedConstantInitializer(expression));
		}
	});

	context.on('TemplateLiteral', function * (node) {
		const expression = getOutermostTypeScriptExpression(node);
		if (isTaggedTemplateLiteral(node) || shouldSkipString(node, expression, sourceCode)) {
			return;
		}

		const isConstantInitializer = node.expressions.length === 0 && isNamedConstantInitializer(expression);
		for (const quasi of node.quasis) {
			yield * getStringProblems(quasi, getTemplateElementRaw(quasi, context), quasi.value.raw, isConstantInitializer);
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
			description: 'Require names for numeric escape sequences in strings and JSX.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
