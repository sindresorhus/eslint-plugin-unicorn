'use strict';
const {
	visitRegExpAST,
	parseRegExpLiteral
} = require('regexpp');

const getDocumentationUrl = require('./utils/get-documentation-url');
const replaceTemplateElement = require('./utils/replace-template-element');

const escapeWithLowercase = /(?<before>(?:^|[^\\])(?:\\\\)*)\\(?<data>x[\da-f]{2}|u[\da-f]{4}|u{[\da-f]+})/;
const escapePatternWithLowercase = /(?<before>(?:^|[^\\])(?:\\\\)*)\\(?<data>x[\da-f]{2}|u[\da-f]{4}|u{[\da-f]+}|c[a-z])/;
const hasLowercaseCharacter = /[a-z]+/;
const message = 'Use uppercase characters for the value of the escape sequence.';

const fix = (value, regexp) => {
	const results = regexp.exec(value);

	if (results) {
		const {before, data} = results.groups;
		const prefix = before.length + 1;
		const fixedEscape = data.slice(0, 1) + data.slice(1).toUpperCase();
		return (
			value.slice(0, results.index + prefix) +
			fixedEscape +
			value.slice(results.index + results[0].length)
		);
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

			if (matches && matches.groups.data.slice(1).match(hasLowercaseCharacter)) {
				// There is no `range` property in AST from `regexpp`
				// reference: https://github.com/mysticatea/regexpp/blob/master/src/ast.ts#L60-L71
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
		return (
			raw.slice(0, start) +
			fix(raw.slice(start, end), escapePatternWithLowercase) +
			raw.slice(end, raw.length)
		);
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

			if (matches && matches.groups.data.slice(1).match(hasLowercaseCharacter)) {
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
			const matches = node.value.raw.match(escapeWithLowercase);

			if (matches && matches[2].slice(1).match(hasLowercaseCharacter)) {
				context.report({
					node,
					message,
					fix: fixer => replaceTemplateElement(
						fixer,
						node,
						fix(node.value.raw, escapeWithLowercase)
					)
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
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
