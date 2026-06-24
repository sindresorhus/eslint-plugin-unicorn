import {isStringLiteral} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {
	escapeString,
	getParenthesizedRange,
	isParenthesized,
	needsSemicolon,
} from './utils/index.js';
import escapeTemplateElementRaw from './utils/escape-template-element-raw.js';

const MESSAGE_ID = 'no-useless-concat';
const messages = {
	[MESSAGE_ID]: 'Do not concatenate two literals, combine them into one.',
};

// A `+` operand that is a template literal can never be tagged, since tagging produces a `TaggedTemplateExpression` node instead.
const isStringish = node => isStringLiteral(node) || node.type === 'TemplateLiteral';

// The string value of a literal, or `undefined` if it's a template literal with expressions.
function getStringValue(node) {
	if (isStringLiteral(node)) {
		return node.value;
	}

	if (node.expressions.length === 0) {
		return node.quasis[0].value.cooked;
	}
}

// Legacy octal (`\1`, `\012`) and `\8`/`\9` escapes are valid in sloppy-mode string literals but are syntax errors inside template literals.
const hasTemplateIncompatibleEscape = raw => /(?<=(?:^|[^\\])(?:\\\\)*)\\(?:[1-9]|0\d)/v.test(raw);

// Whether the string contains a `${…}` placeholder. The regex mirrors ESLint's `no-template-curly-in-string`, which we defer to, so an empty `${}` is intentionally not matched.
const hasTemplatePlaceholder = string => /\$\{[^}]+\}/u.test(string);

const formsTemplatePlaceholderBoundary = (leftRaw, rightRaw) => leftRaw.endsWith('$') && rightRaw.startsWith('{');

// The raw inner content of a literal as it would appear inside a template literal.
function toTemplateElementRaw(node, sourceCode) {
	if (node.type === 'TemplateLiteral') {
		return sourceCode.getText(node).slice(1, -1);
	}

	return escapeTemplateElementRaw(node.raw.slice(1, -1));
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('BinaryExpression', node => {
		const {right} = node;
		if (node.operator !== '+' || !isStringish(right)) {
			return;
		}

		// The literal directly to the left of the `+`. For `'a' + 'b'` it's the left operand; for `foo + 'a' + 'b'` it's the right operand of the left `+`.
		let left;
		if (isStringish(node.left)) {
			left = node.left;
		} else if (node.left.type === 'BinaryExpression' && node.left.operator === '+' && isStringish(node.left.right)) {
			left = node.left.right;
		} else {
			return;
		}

		// Allow concatenation spanning multiple lines, it's often used intentionally for readability.
		if (sourceCode.getLoc(left).end.line !== sourceCode.getLoc(right).start.line) {
			return;
		}

		// Whether `left` is the right operand of a preceding `+`, as in `foo + 'a' + 'b'`.
		const isChain = left !== node.left;

		const leftValue = getStringValue(left);
		const rightValue = getStringValue(right);

		// Merging into a single string that contains a `${…}` placeholder produces an ambiguous template-like literal that `no-template-curly-in-string` flags. The split is likely intentional, so leave it alone.
		if (
			leftValue !== undefined
			&& rightValue !== undefined
			&& hasTemplatePlaceholder(leftValue + rightValue)
		) {
			return;
		}

		let replacement;
		if (leftValue === undefined || rightValue === undefined) {
			const leftRaw = toTemplateElementRaw(left, sourceCode);
			const rightRaw = toTemplateElementRaw(right, sourceCode);
			if (formsTemplatePlaceholderBoundary(leftRaw, rightRaw)) {
				return;
			}

			replacement = `\`${leftRaw}${rightRaw}\``;
		} else {
			replacement = escapeString(leftValue + rightValue);
		}

		const operatorToken = sourceCode.getTokenBefore(right, token => token.type === 'Punctuator' && token.value === '+');

		return {
			node,
			loc: sourceCode.getLoc(operatorToken),
			messageId: MESSAGE_ID,
			* fix(fixer, {abort}) {
				const range = [getParenthesizedRange(left, context)[0], getParenthesizedRange(right, context)[1]];

				// Don't drop comments inside the replaced range.
				if (sourceCode.getCommentsInside(node).some(comment => {
					const [start, end] = sourceCode.getRange(comment);
					return start >= range[0] && end <= range[1];
				})) {
					return abort();
				}

				// In a chain like `(foo + 'a') + 'b'`, the parentheses around the left side sit inside the replaced range, so folding would drop the closing parenthesis.
				if (isChain && isParenthesized(node.left, context)) {
					return abort();
				}

				// In a chain like `foo + 'a' + `${bar()}``, folding moves the right template's expressions before the left side is coerced, changing the order of side effects.
				if (isChain && rightValue === undefined) {
					return abort();
				}

				let text = replacement;

				// A template literal replacement starts with a backtick, which needs care around what precedes it.
				if (text.startsWith('`')) {
					// Don't move a string literal's template-incompatible escape into a template literal, it would be a syntax error.
					if (hasTemplateIncompatibleEscape(text)) {
						return abort();
					}

					// A backtick after a keyword like `return` would form a tagged template, so keep them apart.
					yield fixSpaceAroundKeyword(fixer, node, context);

					// A backtick after an expression on a previous line would attach as a tagged template, so add the semicolon that automatic semicolon insertion no longer provides.
					if (needsSemicolon(sourceCode.getTokenBefore({range}), context, text)) {
						text = `;${text}`;
					}
				}

				yield fixer.replaceTextRange(range, text);
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless concatenation of literals.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
