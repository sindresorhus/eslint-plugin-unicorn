import {
	isBigIntLiteral,
	isFunction,
	isNullLiteral,
	isRegexLiteral,
	isTaggedTemplateLiteral,
} from './ast/index.js';
import {
	escapeString,
} from './utils/index.js';
import escapeTemplateElementRaw from './utils/escape-template-element-raw.js';

const MESSAGE_ID = 'no-useless-template-literals';
const MESSAGE_ID_SUGGESTION = 'no-useless-template-literals/suggestion';

const messages = {
	[MESSAGE_ID]: 'Do not use unnecessary template literal expressions.',
	[MESSAGE_ID_SUGGESTION]: 'Use `{{replacement}}` instead.',
};

const primitiveTypes = new Set([
	'number',
	'boolean',
]);

// Legacy octal (`\1`, `\012`) and `\8`/`\9` escapes are valid in sloppy-mode strings but are syntax errors inside template literals.
const hasTemplateIncompatibleEscape = raw => /(?<=(?:^|[^\\])(?:\\\\)*)\\(?:[1-9]|0\d)/v.test(raw);

function getStaticUnaryStringValue(node) {
	if (
		node.type !== 'UnaryExpression'
		|| !['+', '-'].includes(node.operator)
	) {
		return;
	}

	const {argument} = node;
	let cooked;
	if (typeof argument.value === 'number') {
		cooked = String(node.operator === '-' ? -argument.value : argument.value);
	} else if (
		node.operator === '-'
		&& isBigIntLiteral(argument)
	) {
		cooked = String(-BigInt(argument.bigint));
	} else {
		return;
	}

	return {
		cooked,
		raw: cooked,
	};
}

function endsWithUnescapedDollarSign(string) {
	if (!string.endsWith('$')) {
		return false;
	}

	let backslashCount = 0;
	for (let index = string.length - 2; index >= 0 && string[index] === '\\'; index--) {
		backslashCount++;
	}

	return backslashCount % 2 === 0;
}

function endsWithNulEscape(string) {
	if (!string.endsWith('0')) {
		return false;
	}

	let backslashCount = 0;
	for (let index = string.length - 2; index >= 0 && string[index] === '\\'; index--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1;
}

function appendTemplateRaw(raw, addition) {
	if (
		/^\d/v.test(addition)
		&& endsWithNulEscape(raw)
	) {
		return;
	}

	if (
		addition.startsWith('{')
		&& endsWithUnescapedDollarSign(raw)
	) {
		raw = String.raw`${raw.slice(0, -1)}\$`;
	}

	return raw + addition;
}

function getStaticInterpolationValue(node, sourceCode) {
	const staticUnaryStringValue = getStaticUnaryStringValue(node);
	if (staticUnaryStringValue) {
		return staticUnaryStringValue;
	}

	if (node.type === 'Literal') {
		if (isRegexLiteral(node)) {
			return;
		}

		if (typeof node.value === 'string') {
			const raw = node.raw.slice(1, -1);

			return {
				cooked: node.value,
				raw: escapeTemplateElementRaw(raw),
				hasTemplateIncompatibleEscape: hasTemplateIncompatibleEscape(raw),
			};
		}

		if (
			primitiveTypes.has(typeof node.value)
			|| isNullLiteral(node)
			|| isBigIntLiteral(node)
		) {
			const cooked = isBigIntLiteral(node) ? node.bigint : String(node.value);

			return {
				cooked,
				raw: cooked,
			};
		}

		return;
	}

	if (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	) {
		return {
			cooked: node.quasis[0].value.cooked,
			raw: sourceCode.getText(node).slice(1, -1),
		};
	}
}

function hasCommentsInsideInterpolation(node, sourceCode, index) {
	const [, quasiEnd] = sourceCode.getRange(node.quasis[index]);
	const [nextQuasiStart] = sourceCode.getRange(node.quasis[index + 1]);
	const start = quasiEnd - 2;
	const end = nextQuasiStart + 1;

	return sourceCode.getCommentsInside(node).some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});
}

function getInterpolationText(node, sourceCode, index) {
	const [, quasiEnd] = sourceCode.getRange(node.quasis[index]);
	const [nextQuasiStart] = sourceCode.getRange(node.quasis[index + 1]);
	return sourceCode.getText().slice(quasiEnd - 2, nextQuasiStart + 1);
}

function getStringCallExpressionText(node, sourceCode) {
	let expression = sourceCode.getText(node);

	if (node.type === 'SequenceExpression') {
		expression = `(${expression})`;
	}

	return `String(${expression})`;
}

function isExpressionOnlyTemplate(node) {
	return (
		node.expressions.length === 1
		&& node.quasis[0].value.raw === ''
		&& node.quasis[1].value.raw === ''
	);
}

function isDirectiveProloguePosition(node) {
	const {parent} = node;

	if (parent.type !== 'ExpressionStatement' || parent.expression !== node) {
		return false;
	}

	const bodyNode = parent.parent;
	const grandparent = bodyNode.parent;
	if (
		bodyNode.type !== 'Program'
		&& !(
			bodyNode.type === 'BlockStatement'
			&& isFunction(grandparent)
		)
	) {
		return false;
	}

	const statementIndex = bodyNode.body.indexOf(parent);
	return bodyNode.body.slice(0, statementIndex).every(statement => typeof statement.directive === 'string');
}

function getStaticInterpolationProblem(node, sourceCode, index) {
	const staticInterpolationValue = getStaticInterpolationValue(node.expressions[index], sourceCode);

	if (!staticInterpolationValue) {
		return;
	}

	return {
		...staticInterpolationValue,
		fixable: !hasCommentsInsideInterpolation(node, sourceCode, index),
	};
}

function getReplacement(node, sourceCode, problems) {
	const hasDynamicExpressions = problems.includes(undefined);
	const shouldUseStringLiteral = !hasDynamicExpressions && node.quasis.every(quasi => quasi.value.raw === '');

	if (!shouldUseStringLiteral) {
		if (problems.some(problem => problem?.hasTemplateIncompatibleEscape)) {
			return;
		}

		let raw = '';

		for (const [index, quasi] of node.quasis.entries()) {
			raw = appendTemplateRaw(raw, quasi.value.raw);
			if (raw === undefined) {
				return;
			}

			if (index === node.expressions.length) {
				break;
			}

			const problem = problems[index];
			raw = problem
				? appendTemplateRaw(raw, problem.raw)
				: raw + getInterpolationText(node, sourceCode, index);

			if (raw === undefined) {
				return;
			}
		}

		return `\`${raw}\``;
	}

	let cooked = '';

	for (const [index, quasi] of node.quasis.entries()) {
		if (quasi.value.cooked === null) {
			return;
		}

		cooked += quasi.value.cooked;

		if (index < problems.length) {
			cooked += problems[index].cooked;
		}
	}

	return escapeString(cooked);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('TemplateLiteral', node => {
		if (isTaggedTemplateLiteral(node)) {
			return;
		}

		if (isExpressionOnlyTemplate(node)) {
			const [expression] = node.expressions;
			const problem = getStaticInterpolationProblem(node, sourceCode, 0);

			if (problem) {
				const isDirectivePrologue = isDirectiveProloguePosition(node);

				return {
					node,
					messageId: MESSAGE_ID,
					fix(fixer) {
						if (!problem.fixable || isDirectivePrologue) {
							return;
						}

						return fixer.replaceText(node, escapeString(problem.cooked));
					},
				};
			}

			const hasComments = hasCommentsInsideInterpolation(node, sourceCode, 0);
			const replacement = getStringCallExpressionText(expression, sourceCode);

			return {
				node,
				messageId: MESSAGE_ID,
				...(!hasComments && {
					suggest: [
						{
							messageId: MESSAGE_ID_SUGGESTION,
							data: {
								replacement,
							},
							fix: fixer => fixer.replaceText(node, replacement),
						},
					],
				}),
			};
		}

		const problems = node.expressions.map((_, index) => getStaticInterpolationProblem(node, sourceCode, index));

		if (problems.every(problem => problem === undefined)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			fix(fixer) {
				if (problems.some(problem => problem && !problem.fixable)) {
					return;
				}

				const replacement = getReplacement(node, sourceCode, problems);

				if (
					replacement === undefined
					|| (
						isDirectiveProloguePosition(node)
						&& !replacement.startsWith('`')
					)
				) {
					return;
				}

				return fixer.replaceText(node, replacement);
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
			description: 'Disallow useless template literal expressions.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
