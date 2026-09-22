import {string as cssString} from '@eslint/css-tree';
import {replaceTemplateElement} from './fix/index.js';
import {
	escapeString,
	escapeTemplateElementRaw,
	getComments,
	getTemplateElementRaw,
} from './utils/index.js';

const defaultMessage = 'Prefer `{{suggest}}` over `{{match}}`.';
const SUGGESTION_MESSAGE_ID = 'replace';
const messages = {
	[SUGGESTION_MESSAGE_ID]: 'Replace `{{match}}` with `{{suggest}}`.',
};

const yamlCharactersToEscape = /[\u{7f}-\u{9f}\u{2028}\u{2029}\u{fffe}\u{ffff}]/gu;

const targetNodeTypes = ['Literal', 'TemplateElement', 'TOMLValue', 'String', 'Url', 'YAMLScalar'];

const ignoredIdentifier = new Set([
	'gql',
	'html',
	'sql',
	'svg',
]);

const ignoredMemberExpressionObject = new Set([
	'styled',
]);

const isIgnoredTag = node => {
	if (!node.parent || !node.parent.parent || !node.parent.parent.tag) {
		return false;
	}

	const {tag} = node.parent.parent;

	if (tag.type === 'Identifier' && ignoredIdentifier.has(tag.name)) {
		return true;
	}

	if (tag.type === 'MemberExpression') {
		const {object} = tag;
		if (
			object.type === 'Identifier'
			&& ignoredMemberExpressionObject.has(object.name)
		) {
			return true;
		}
	}

	return false;
};

function getReplacements(patterns) {
	return Object.entries(patterns)
		.map(([match, options]) => {
			if (typeof options === 'string') {
				options = {
					suggest: options,
				};
			}

			const flags = options.caseSensitive === false ? 'giu' : 'gu';

			return {
				match,
				regex: new RegExp(match, flags),
				fix: true,
				...options,
			};
		});
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {patterns, selectors} = context.options[0];
	const isCss = context.sourceCode.ast.type === 'StyleSheet';
	const replacements = getReplacements(patterns);

	if (replacements.length === 0) {
		return;
	}

	const checked = new WeakSet();

	const getProblem = node => {
		const {type, value, raw} = node;

		if (checked.has(node) || !targetNodeTypes.includes(type)) {
			return;
		}

		checked.add(node);

		let string;
		if (type !== 'TemplateElement') {
			string = value;
		} else if (!isIgnoredTag(node)) {
			string = getTemplateElementRaw(node, context);
		}

		if (!string || typeof string !== 'string') {
			return;
		}

		const replacement = replacements.find(({regex}) => regex.test(string));

		if (!replacement) {
			return;
		}

		const {fix: autoFix, message = defaultMessage, match, suggest, regex} = replacement;
		const problem = {
			node,
			message,
			data: {
				match,
				suggest,
			},
		};

		const fixed = string.replace(regex, () => suggest);
		if (type === 'Url') {
			const [start, end] = context.sourceCode.getRange(node);
			if (getComments(context).some(comment => {
				const [commentStart, commentEnd] = context.sourceCode.getRange(comment);
				return commentStart >= start && commentEnd <= end;
			})) {
				return problem;
			}
		}

		if (((type === 'TOMLValue' || type === 'YAMLScalar' || isCss) && !fixed.isWellFormed()) || (isCss && fixed.includes('\0'))) {
			return problem;
		}

		const fix = fixer => {
			if (type === 'YAMLScalar') {
				const replacementText = JSON.stringify(fixed).replaceAll(yamlCharactersToEscape, character => String.raw`\u${character.codePointAt(0).toString(16).padStart(4, '0')}`);
				return fixer.replaceText(node, replacementText);
			}

			if (type === 'String' || type === 'Url') {
				const replacementText = isCss ? cssString.encode(fixed) : JSON.stringify(fixed);
				return fixer.replaceText(node, type === 'Url' ? `url(${replacementText})` : replacementText);
			}

			if (type === 'TOMLValue') {
				// JSON string escapes are valid in TOML, but TOML also requires escaping DEL.
				return fixer.replaceText(node, JSON.stringify(fixed).replaceAll('\u007F', String.raw`\u007F`));
			}

			if (type === 'Literal') {
				const [quote] = raw;
				let replacementText;
				if (node.parent.type === 'JSXAttribute') {
					// JSX attribute strings don't support backslash escapes, so encode the delimiter
					// quote as an HTML entity (which JSX decodes) instead of escaping it.
					const entity = quote === '"' ? '&quot;' : '&#39;';
					replacementText = quote + fixed.replaceAll(quote, () => entity) + quote;
				} else {
					replacementText = escapeString(fixed, quote);
				}

				return fixer.replaceText(node, replacementText);
			}

			return replaceTemplateElement(node, escapeTemplateElementRaw(fixed), context, fixer);
		};

		if (autoFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: SUGGESTION_MESSAGE_ID,
					fix,
				},
			];
		}

		return problem;
	};

	context.on(
		selectors.length === 0 ? targetNodeTypes : selectors,
		node => {
			if (node.type === 'YAMLScalar' && (['literal', 'folded'].includes(node.style) || node.parent.tag)) {
				return;
			}

			return getProblem(node);
		},
	);
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			patterns: {
				type: 'object',
				description: 'Patterns to replace in string content.',
				additionalProperties: {
					anyOf: [
						{
							type: 'string',
						},
						{
							type: 'object',
							required: [
								'suggest',
							],
							properties: {
								suggest: {
									type: 'string',
								},
								fix: {
									type: 'boolean',
									// Default: true
								},
								caseSensitive: {
									type: 'boolean',
									// Default: true
								},
								message: {
									type: 'string',
									// Default: ''
								},
							},
							additionalProperties: false,
						},
					],
				},
			},
			selectors: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'AST selectors for string nodes to check.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce better string content.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{patterns: {}, selectors: []}],
		messages,
		languages: [
			'js/js',
			'yml/yaml',
			'json/json',
			'json/jsonc',
			'json/json5',
			'css/css',
			'toml/toml',
		],
	},
};

export default config;
