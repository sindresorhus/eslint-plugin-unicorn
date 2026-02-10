import assertToken from './utils/assert-token.js';
import {getCallExpressionTokens} from './utils/index.js';
import {isStaticRequire, isFunction} from './ast/index.js';
import {removeParentheses, replaceReferenceIdentifier, removeSpacesAfter} from './fix/index.js';

const ERROR_USE_STRICT_DIRECTIVE = 'error/use-strict-directive';
const ERROR_GLOBAL_RETURN = 'error/global-return';
const ERROR_IDENTIFIER = 'error/identifier';
const SUGGESTION_USE_STRICT_DIRECTIVE = 'suggestion/use-strict-directive';
const SUGGESTION_IMPORT_META_DIRNAME = 'suggestion/import-meta-dirname';
const SUGGESTION_IMPORT_META_URL_TO_DIRNAME = 'suggestion/import-meta-url-to-dirname';
const SUGGESTION_IMPORT_META_FILENAME = 'suggestion/import-meta-filename';
const SUGGESTION_IMPORT_META_URL_TO_FILENAME = 'suggestion/import-meta-url-to-filename';
const SUGGESTION_IMPORT = 'suggestion/import';
const SUGGESTION_EXPORT = 'suggestion/export';
const messages = {
	[ERROR_USE_STRICT_DIRECTIVE]: 'Do not use "use strict" directive.',
	[ERROR_GLOBAL_RETURN]: '"return" should be used inside a function.',
	[ERROR_IDENTIFIER]: 'Do not use "{{name}}".',
	[SUGGESTION_USE_STRICT_DIRECTIVE]: 'Remove "use strict" directive.',
	[SUGGESTION_IMPORT_META_DIRNAME]: 'Replace `__dirname` with `import.meta.dirname`.',
	[SUGGESTION_IMPORT_META_URL_TO_DIRNAME]: 'Replace `__dirname` with `…(import.meta.url)`.',
	[SUGGESTION_IMPORT_META_FILENAME]: 'Replace `__filename` with `import.meta.filename`.',
	[SUGGESTION_IMPORT_META_URL_TO_FILENAME]: 'Replace `__filename` with `…(import.meta.url)`.',
	[SUGGESTION_IMPORT]: 'Switch to `import`.',
	[SUGGESTION_EXPORT]: 'Switch to `export`.',
};

const suggestions = new Map([
	[
		'__dirname',
		[
			{
				messageId: SUGGESTION_IMPORT_META_DIRNAME,
				replacement: 'import.meta.dirname',
			},
			{
				messageId: SUGGESTION_IMPORT_META_URL_TO_DIRNAME,
				replacement: 'path.dirname(url.fileURLToPath(import.meta.url))',
			},
		],
	],
	[
		'__filename',
		[
			{
				messageId: SUGGESTION_IMPORT_META_FILENAME,
				replacement: 'import.meta.filename',
			},
			{
				messageId: SUGGESTION_IMPORT_META_URL_TO_FILENAME,
				replacement: 'url.fileURLToPath(import.meta.url)',
			},
		],
	],
]);

const commonJsGlobals = new Set([
	'exports',
	'require',
	'module',
	'__filename',
	'__dirname',
]);

function fixRequireCall(node, context) {
	if (!isStaticRequire(node.parent) || node.parent.callee !== node) {
		return;
	}

	const requireCall = node.parent;
	const {
		parent,
		callee,
		arguments: [source],
	} = requireCall;

	// `require("foo")`
	if (parent.type === 'ExpressionStatement' && parent.parent.type === 'Program') {
		return function * (fixer) {
			yield fixer.replaceText(callee, 'import');

			const {
				openingParenthesisToken,
				closingParenthesisToken,
			} = getCallExpressionTokens(requireCall, context);
			yield fixer.replaceText(openingParenthesisToken, ' ');
			yield fixer.remove(closingParenthesisToken);

			for (const node of [callee, requireCall, source]) {
				yield removeParentheses(node, fixer, context);
			}
		};
	}

	// `const foo = require("foo")`
	// `const {foo} = require("foo")`
	if (
		parent.type === 'VariableDeclarator'
		&& parent.init === requireCall
		&& (
			parent.id.type === 'Identifier'
			|| (
				parent.id.type === 'ObjectPattern'
				&& parent.id.properties.every(
					({type, key, value, computed}) =>
						type === 'Property'
						&& !computed
						&& value.type === 'Identifier'
						&& key.type === 'Identifier',
				)
			)
		)
		&& parent.parent.type === 'VariableDeclaration'
		&& parent.parent.kind === 'const'
		&& parent.parent.declarations.length === 1
		&& parent.parent.declarations[0] === parent
		&& parent.parent.parent.type === 'Program'
	) {
		const declarator = parent;
		const declaration = declarator.parent;
		const {id} = declarator;

		return function * (fixer) {
			const {sourceCode} = context;
			const constToken = sourceCode.getFirstToken(declaration);
			assertToken(constToken, {
				expected: {type: 'Keyword', value: 'const'},
				ruleId: 'prefer-module',
			});
			yield fixer.replaceText(constToken, 'import');

			const equalToken = sourceCode.getTokenAfter(id);
			assertToken(equalToken, {
				expected: {type: 'Punctuator', value: '='},
				ruleId: 'prefer-module',
			});
			yield removeSpacesAfter(id, context, fixer);
			yield removeSpacesAfter(equalToken, context, fixer);
			yield fixer.replaceText(equalToken, ' from ');

			yield fixer.remove(callee);

			const {
				openingParenthesisToken,
				closingParenthesisToken,
			} = getCallExpressionTokens(requireCall, context);
			yield fixer.remove(openingParenthesisToken);
			yield fixer.remove(closingParenthesisToken);

			for (const node of [callee, requireCall, source]) {
				yield removeParentheses(node, fixer, context);
			}

			if (id.type === 'Identifier') {
				return;
			}

			const {properties} = id;

			for (const property of properties) {
				const {key, shorthand} = property;
				if (!shorthand) {
					const commaToken = sourceCode.getTokenAfter(key);
					assertToken(commaToken, {
						expected: {type: 'Punctuator', value: ':'},
						ruleId: 'prefer-module',
					});
					yield removeSpacesAfter(key, context, fixer);
					yield removeSpacesAfter(commaToken, context, fixer);
					yield fixer.replaceText(commaToken, ' as ');
				}
			}
		};
	}
}

const isTopLevelAssignment = node =>
	node.parent.type === 'AssignmentExpression'
	&& node.parent.operator === '='
	&& node.parent.left === node
	&& node.parent.parent.type === 'ExpressionStatement'
	&& node.parent.parent.parent.type === 'Program';
const isNamedExport = node =>
	node.parent.type === 'MemberExpression'
	&& !node.parent.optional
	&& !node.parent.computed
	&& node.parent.object === node
	&& node.parent.property.type === 'Identifier'
	&& isTopLevelAssignment(node.parent)
	&& node.parent.parent.right.type === 'Identifier';
const isModuleExports = node =>
	node.parent.type === 'MemberExpression'
	&& !node.parent.optional
	&& !node.parent.computed
	&& node.parent.object === node
	&& node.parent.property.type === 'Identifier'
	&& node.parent.property.name === 'exports';
const isTopLevelReturnStatement = node => {
	for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
		if (isFunction(ancestor)) {
			return false;
		}
	}

	return true;
};

function fixDefaultExport(node, context) {
	return function * (fixer) {
		yield fixer.replaceText(node, 'export default ');
		yield removeSpacesAfter(node, context, fixer);

		const equalToken = context.sourceCode.getTokenAfter(node, token => token.type === 'Punctuator' && token.value === '=');
		yield fixer.remove(equalToken);
		yield removeSpacesAfter(equalToken, context, fixer);

		for (const currentNode of [node.parent, node]) {
			yield removeParentheses(currentNode, fixer, context);
		}
	};
}

function fixNamedExport(node, context) {
	return function * (fixer) {
		const assignmentExpression = node.parent.parent;
		const exported = node.parent.property.name;
		const local = assignmentExpression.right.name;
		yield fixer.replaceText(assignmentExpression, `export {${local} as ${exported}}`);

		yield removeParentheses(assignmentExpression, fixer, context);
	};
}

function fixExports(node, context) {
	// `exports = bar`
	if (isTopLevelAssignment(node)) {
		return fixDefaultExport(node, context);
	}

	// `exports.foo = bar`
	if (isNamedExport(node)) {
		return fixNamedExport(node, context);
	}
}

function fixModuleExports(node, context) {
	if (isModuleExports(node)) {
		return fixExports(node.parent, context);
	}
}

function create(context) {
	const filename = context.filename.toLowerCase();

	if (filename.endsWith('.cjs')) {
		return;
	}

	const {sourceCode} = context;

	context.on('ExpressionStatement', node => {
		if (node.directive !== 'use strict') {
			return;
		}

		const problem = {node, messageId: ERROR_USE_STRICT_DIRECTIVE};
		const fix = function * (fixer) {
			yield fixer.remove(node);
			yield removeSpacesAfter(node, context, fixer);
		};

		if (filename.endsWith('.mjs')) {
			problem.fix = fix;
		} else {
			problem.suggest = [{messageId: SUGGESTION_USE_STRICT_DIRECTIVE, fix}];
		}

		return problem;
	});

	context.on('ReturnStatement', node => {
		if (isTopLevelReturnStatement(node)) {
			return {
				node: sourceCode.getFirstToken(node),
				messageId: ERROR_GLOBAL_RETURN,
			};
		}
	});

	context.on('Identifier', node => {
		if (!commonJsGlobals.has(node.name) || !context.sourceCode.isGlobalReference(node)) {
			return;
		}

		const {name} = node;

		const problem = {
			node,
			messageId: ERROR_IDENTIFIER,
			data: {name},
		};

		switch (name) {
			case '__filename':
			case '__dirname': {
				problem.suggest = suggestions.get(node.name)
					.map(({messageId, replacement}) => ({
						messageId,
						fix: fixer => replaceReferenceIdentifier(node, replacement, context, fixer),
					}));

				return problem;
			}

			case 'require': {
				const fix = fixRequireCall(node, context);
				if (fix) {
					problem.suggest = [{
						messageId: SUGGESTION_IMPORT,
						fix,
					}];
					return problem;
				}

				break;
			}

			case 'exports': {
				const fix = fixExports(node, context);
				if (fix) {
					problem.suggest = [{
						messageId: SUGGESTION_EXPORT,
						fix,
					}];
					return problem;
				}

				break;
			}

			case 'module': {
				const fix = fixModuleExports(node, context);
				if (fix) {
					problem.suggest = [{
						messageId: SUGGESTION_EXPORT,
						fix,
					}];
					return problem;
				}

				break;
			}

			default:
		}

		return problem;
	});
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer JavaScript modules (ESM) over CommonJS.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
