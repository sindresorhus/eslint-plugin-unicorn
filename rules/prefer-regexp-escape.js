import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
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

const addVariable = (identifier, variables, sourceCode) => {
	const variable = findVariable(sourceCode.getScope(identifier), identifier);
	if (variable) {
		variables.add(variable);
	}
};

const isDefaultImportSpecifier = specifier =>
	specifier.type === 'ImportDefaultSpecifier'
	|| (
		specifier.type === 'ImportSpecifier'
		&& specifier.imported.type === 'Identifier'
		&& specifier.imported.name === 'default'
	);

const isTrackedVariable = (identifier, variables, sourceCode) =>
	variables.has(findVariable(sourceCode.getScope(identifier), identifier));

const isStaticNonString = (node, sourceCode) => {
	const result = getStaticValue(node, sourceCode.getScope(node));
	return Boolean(result) && typeof result.value !== 'string';
};

const isLodashObject = (identifier, lodashObjectVariables, sourceCode) => {
	const variable = findVariable(sourceCode.getScope(identifier), identifier);
	if (variable) {
		return lodashObjectVariables.has(variable)
			|| (
				variable.defs.length === 0
				&& LODASH_OBJECT_NAMES.has(identifier.name)
			);
	}

	return LODASH_OBJECT_NAMES.has(identifier.name);
};

const isLodashRegExpEscapeCall = (node, lodashObjectVariables, sourceCode) =>
	isMethodCall(node, {
		method: 'escapeRegExp',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& node.callee.object.type === 'Identifier'
	&& isLodashObject(node.callee.object, lodashObjectVariables, sourceCode);

const isRegExpEscapeFunctionCall = (node, regexpEscapeFunctionVariables, sourceCode) =>
	node.optional !== true
	&& node.callee.type === 'Identifier'
	&& isTrackedVariable(node.callee, regexpEscapeFunctionVariables, sourceCode)
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
	const regexpEscapeFunctionVariables = new WeakSet();
	const lodashObjectVariables = new WeakSet();

	context.on('ImportDeclaration', node => {
		if (!isStringLiteral(node.source)) {
			return;
		}

		const {value: packageName} = node.source;

		if (REGEXP_ESCAPE_FUNCTION_PACKAGES.has(packageName)) {
			for (const specifier of node.specifiers) {
				if (isDefaultImportSpecifier(specifier)) {
					addVariable(specifier.local, regexpEscapeFunctionVariables, sourceCode);
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
				addVariable(specifier.local, lodashObjectVariables, sourceCode);
			}

			if (
				specifier.type === 'ImportSpecifier'
				&& specifier.imported.type === 'Identifier'
				&& specifier.imported.name === 'escapeRegExp'
			) {
				addVariable(specifier.local, regexpEscapeFunctionVariables, sourceCode);
			}
		}
	});

	context.on('VariableDeclarator', node => {
		const packageName = getRequiredPackageName(node.init);

		if (node.id.type === 'Identifier') {
			if (REGEXP_ESCAPE_FUNCTION_PACKAGES.has(packageName)) {
				addVariable(node.id, regexpEscapeFunctionVariables, sourceCode);
				return;
			}

			if (LODASH_PACKAGES.has(packageName)) {
				addVariable(node.id, lodashObjectVariables, sourceCode);
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
				addVariable(property.value, regexpEscapeFunctionVariables, sourceCode);
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
				isRegExpEscapeFunctionCall(node, regexpEscapeFunctionVariables, sourceCode)
				|| isLodashRegExpEscapeCall(node, lodashObjectVariables, sourceCode)
			)
			|| node.arguments[0].type === 'SpreadElement'
		) {
			return;
		}

		const [argument] = node.arguments;
		if (
			isKnownNonString(argument, context)
			|| isStaticNonString(argument, sourceCode)
		) {
			return;
		}

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
			// TODO: Enable in recommended preset when targeting Node.js 24.
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
