'use strict';
const {
	visitRegExpAST,
	parseRegExpLiteral
} = require('regexpp');

const getDocsUrl = require('./utils/get-docs-url');

const escapeWithLowercase = /((?:^|[^\\])(?:\\\\)*)\\(x[a-f\d]{2}|u[a-f\d]{4}|u{(?:[a-f\d]+)})/;
const escapePatternWithLowercase = /((?:^|[^\\])(?:\\\\)*)\\(x[a-f\d]{2}|u[a-f\d]{4}|u{(?:[a-f\d]+)}|c[a-z])/;
const hasLowercaseCharacter = /[a-z]+/;
const message = 'Use uppercase characters for the value of the escape sequence.';

const fix = (value, regexp) => {
	const results = regexp.exec(value);

	if (results) {
		const prefix = results[1].length + 1;
		const fixedEscape = results[2].slice(0, 1) + results[2].slice(1).toUpperCase();
		return value.slice(0, results.index + prefix) + fixedEscape + value.slice(results.index + results[0].length);
	}

	return value;
};

/**
Find the `[start, end]` position of the lowercase escape sequence in a regular expression literal ASTNode.

@param {string} value - String representation of a literal ASTNode.
@returns {number[] | undefined} The `[start, end]` pair if found, or null if not.
*/
const findLowercaseEscape = value => {
	const ast = parseRegExpLiteral(value);

	let escapeNodePosition;
	visitRegExpAST(ast, {
		/**
Record escaped node position in regexpp ASTNode. Returns undefined if not found.
@param {ASTNode} node A regexpp ASTNode. Note that it is of different type to the ASTNode of ESLint parsers
@returns {undefined}
*/
		onCharacterLeave(node) {
			if (escapeNodePosition) {
				return;
			}

			const matches = node.raw.match(escapePatternWithLowercase);

			if (matches && matches[2].slice(1).match(hasLowercaseCharacter)) {
				escapeNodePosition = [node.start, node.end];
			}
		}
	});

	return escapeNodePosition;
};

/**
Produce a fix if there is a lowercase escape sequence in the node.

@param {ASTNode} node - The regular expression literal ASTNode to check.
@returns {string} The fixed `node.raw` string.
*/
const fixRegExp = node => {
	const escapeNodePosition = findLowercaseEscape(node.raw);
	const {raw} = node;

	if (escapeNodePosition) {
		const [start, end] = escapeNodePosition;
		return raw.slice(0, start) + fix(raw.slice(start, end), escapePatternWithLowercase) + raw.slice(end, raw.length);
	}

	return raw;
};

const create = context => {
	return {
		Literal(node) {
			if (typeof node.value !== 'string') {
				return;
			}

			const matches = node.raw.match(escapeWithLowercase);

			if (matches && matches[2].slice(1).match(hasLowercaseCharacter)) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(node, fix(node.raw, escapeWithLowercase))
				});
			}
		},
		'Literal[regex]'(node) {
			const escapeNodePosition = findLowercaseEscape(node.raw);

			if (escapeNodePosition) {
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceText(node, fixRegExp(node))
				});
			}
		},
		TemplateElement(node) {
			if (typeof node.value.raw !== 'string') {
				return;
			}

			const matches = node.value.raw.match(escapeWithLowercase);

			if (matches && matches[2].slice(1).match(hasLowercaseCharacter)) {
				// Move cursor inside the head and tail apostrophe
				const start = node.range[0] + 1;
				const end = node.range[1] - 1;
				context.report({
					node,
					message,
					fix: fixer => fixer.replaceTextRange([start, end], fix(node.value.raw, escapeWithLowercase))
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
