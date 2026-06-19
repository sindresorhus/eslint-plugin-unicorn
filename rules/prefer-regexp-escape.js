import {
	isMethodCall,
	isStringLiteral,
} from './ast/index.js';
import {isRegExpEscapeReplaceCall} from './shared/regexp-escape.js';
import {getParenthesizedText, isKnownNonString} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-regexp-escape';
const REGEXP_ESCAPE_FUNCTION_PACKAGES = new Set([
	'escape-string-regexp',
	'lodash.escaperegexp',
	'lodash/escapeRegExp',
]);
const LODASH_PACKAGES = new Set([
	'lodash',
	'lodash-es',
]);
const LODASH_OBJECT_NAMES = new Set([
	'_',
	'lodash',
]);

const messages = {
	[MESSAGE_ID]: 'Prefer `RegExp.escape()` for escaping strings to use in regular expressions.',
	replaceWithRegExpEscape: 'Replace with `RegExp.escape()`.',
};

const getRequiredPackageName = node => {
	if (
		node?.type !== 'CallExpression'
		|| node.callee.type !== 'Identifier'
		|| node.callee.name !== 'require'
		|| node.arguments.length !== 1
		|| !isStringLiteral(node.arguments[0])
	) {
		return;
	}

	return node.arguments[0].value;
};

const isLodashRegExpEscapeCall = (node, lodashObjectNames) =>
	isMethodCall(node, {
		objects: [...lodashObjectNames],
		method: 'escapeRegExp',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});

const isRegExpEscapeFunctionCall = (node, regexpEscapeFunctionNames) =>
	node.optional !== true
	&& node.callee.type === 'Identifier'
	&& regexpEscapeFunctionNames.has(node.callee.name)
	&& node.arguments.length === 1;

const getRegExpEscapeCallReplacement = (argument, context) =>
	`RegExp.escape(${getParenthesizedText(argument, context)})`;

const getRegExpEscapeSuggestion = (node, argument, context, sourceCode) => {
	if (sourceCode.getCommentsInside(node).length > 0) {
		return;
	}

	return [
		{
			messageId: 'replaceWithRegExpEscape',
			fix: fixer => fixer.replaceText(node, getRegExpEscapeCallReplacement(argument, context)),
		},
	];
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const regexpEscapeFunctionNames = new Set();
	const lodashObjectNames = new Set(LODASH_OBJECT_NAMES);

	context.on('ImportDeclaration', node => {
		if (!isStringLiteral(node.source)) {
			return;
		}

		const {value: packageName} = node.source;

		if (REGEXP_ESCAPE_FUNCTION_PACKAGES.has(packageName)) {
			for (const specifier of node.specifiers) {
				if (
					specifier.type === 'ImportDefaultSpecifier'
					|| specifier.type === 'ImportSpecifier'
				) {
					regexpEscapeFunctionNames.add(specifier.local.name);
				}
			}

			return;
		}

		if (!LODASH_PACKAGES.has(packageName)) {
			return;
		}

		for (const specifier of node.specifiers) {
			if (
				specifier.type === 'ImportDefaultSpecifier'
				|| specifier.type === 'ImportNamespaceSpecifier'
			) {
				lodashObjectNames.add(specifier.local.name);
			}

			if (
				specifier.type === 'ImportSpecifier'
				&& specifier.imported.type === 'Identifier'
				&& specifier.imported.name === 'escapeRegExp'
			) {
				regexpEscapeFunctionNames.add(specifier.local.name);
			}
		}
	});

	context.on('VariableDeclarator', node => {
		const packageName = getRequiredPackageName(node.init);

		if (node.id.type === 'Identifier') {
			if (REGEXP_ESCAPE_FUNCTION_PACKAGES.has(packageName)) {
				regexpEscapeFunctionNames.add(node.id.name);
				return;
			}

			if (LODASH_PACKAGES.has(packageName)) {
				lodashObjectNames.add(node.id.name);
				return;
			}
		}

		if (
			node.id.type !== 'ObjectPattern'
			|| !LODASH_PACKAGES.has(packageName)
		) {
			return;
		}

		for (const property of node.id.properties) {
			if (
				property.type === 'Property'
				&& property.key.type === 'Identifier'
				&& property.key.name === 'escapeRegExp'
				&& property.value.type === 'Identifier'
			) {
				regexpEscapeFunctionNames.add(property.value.name);
			}
		}
	});

	context.on('CallExpression', node => {
		if (isRegExpEscapeReplaceCall(node)) {
			if (isKnownNonString(node.callee.object, context)) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID,
				/** @param {ESLint.Rule.RuleFixer} fixer */
				* fix(fixer, {abort}) {
					if (
						node.callee.object.type === 'Super'
						|| sourceCode.getCommentsInside(node).length > 0
					) {
						return abort();
					}

					yield fixer.replaceText(node, getRegExpEscapeCallReplacement(node.callee.object, context));
				},
			};
		}

		if (
			!(
				isRegExpEscapeFunctionCall(node, regexpEscapeFunctionNames)
				|| isLodashRegExpEscapeCall(node, lodashObjectNames)
			)
			|| node.arguments[0].type === 'SpreadElement'
		) {
			return;
		}

		const [argument] = node.arguments;

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: getRegExpEscapeSuggestion(node, argument, context, sourceCode),
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `RegExp.escape()` for escaping strings to use in regular expressions.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
