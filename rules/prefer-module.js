import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import isShadowed from './utils/is-shadowed.js';
import assertToken from './utils/assert-token.js';
import {getCallExpressionTokens} from './utils/index.js';
import {
	isStaticRequire, isReferenceIdentifier, isFunction, isLiteral,
} from './ast/index.js';
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
const SUGGESTION_IMPORT_META = 'suggestion/import.meta';
const SUGGESTION_IMPORT_META_DIRNAME_FROM_URL = 'suggestion/import-meta-dirname-from-url';
const SUGGESTION_IMPORT_META_FILENAME_FROM_URL = 'suggestion/import-meta-filename-from-url';
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
	[SUGGESTION_IMPORT_META]: 'Switch to `import.meta.{{name}}`.',
	[SUGGESTION_IMPORT_META_DIRNAME_FROM_URL]: 'Replace `…(import.meta.url)` with `import.meta.dirname`.',
	[SUGGESTION_IMPORT_META_FILENAME_FROM_URL]: 'Replace `…(import.meta.url)` with `import.meta.filename`.',
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

function fixRequireCall(node, sourceCode) {
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
			} = getCallExpressionTokens(sourceCode, requireCall);
			yield fixer.replaceText(openingParenthesisToken, ' ');
			yield fixer.remove(closingParenthesisToken);

			for (const node of [callee, requireCall, source]) {
				yield * removeParentheses(node, fixer, sourceCode);
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
			yield removeSpacesAfter(id, sourceCode, fixer);
			yield removeSpacesAfter(equalToken, sourceCode, fixer);
			yield fixer.replaceText(equalToken, ' from ');

			yield fixer.remove(callee);

			const {
				openingParenthesisToken,
				closingParenthesisToken,
			} = getCallExpressionTokens(sourceCode, requireCall);
			yield fixer.remove(openingParenthesisToken);
			yield fixer.remove(closingParenthesisToken);

			for (const node of [callee, requireCall, source]) {
				yield * removeParentheses(node, fixer, sourceCode);
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
					yield removeSpacesAfter(key, sourceCode, fixer);
					yield removeSpacesAfter(commaToken, sourceCode, fixer);
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

const isImportMeta = node =>
	node.type === 'MetaProperty'
	&& node.meta.name === 'import'
	&& node.property.name === 'meta';

/** @returns {node is import('estree').NewExpression} */
const isNewURL = node =>
	node.type === 'NewExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'URL';

/** @returns {node is import('estree').MemberExpression} */
const isAccessPathname = node =>
	node.type === 'MemberExpression'
	&& getPropertyName(node) === 'pathname';

function isCallNodeBuiltinModule(node, propertyName, nodeModuleName, sourceCode) {
	if (node.type !== 'CallExpression') {
		return false;
	}

	/** @type {{callee: import('estree').Expression}} */
	const {callee} = node;
	if (callee.type === 'MemberExpression') {
		// Check for nodeModuleName.propertyName(...);
		if (callee.object.type !== 'Identifier') {
			return false;
		}

		if (getPropertyName(callee) !== propertyName) {
			return false;
		}

		const specifier = getImportSpecifier(callee.object);
		return specifier?.type === 'ImportDefaultSpecifier' || specifier?.type === 'ImportNamespaceSpecifier';
	}

	if (callee.type === 'Identifier') {
		// Check for propertyName(...);
		const specifier = getImportSpecifier(callee);

		return specifier?.type === 'ImportSpecifier' && specifier.imported.name === propertyName;
	}

	return false;

	function getImportSpecifier(node) {
		const scope = sourceCode.getScope(node);
		const variable = findVariable(scope, node);
		if (!variable || variable.defs.length !== 1) {
			return;
		}

		/** @type {import('eslint').Scope.Definition} */
		const define = variable.defs[0];
		if (
			define.type !== 'ImportBinding'
			|| (define.parent.source.value !== nodeModuleName && define.parent.source.value !== 'node:' + nodeModuleName)
		) {
			return;
		}

		return define.node;
	}
}

/**
 @returns {node is import('estree').SimpleCallExpression}
 */
function isCallFileURLToPath(node, sourceCode) {
	return isCallNodeBuiltinModule(node, 'fileURLToPath', 'url', sourceCode);
}

/**
 @returns {node is import('estree').SimpleCallExpression}
 */
function isCallPathDirname(node, sourceCode) {
	return isCallNodeBuiltinModule(node, 'dirname', 'path', sourceCode);
}

function fixDefaultExport(node, sourceCode) {
	return function * (fixer) {
		yield fixer.replaceText(node, 'export default ');
		yield removeSpacesAfter(node, sourceCode, fixer);

		const equalToken = sourceCode.getTokenAfter(node, token => token.type === 'Punctuator' && token.value === '=');
		yield fixer.remove(equalToken);
		yield removeSpacesAfter(equalToken, sourceCode, fixer);

		for (const currentNode of [node.parent, node]) {
			yield * removeParentheses(currentNode, fixer, sourceCode);
		}
	};
}

function fixNamedExport(node, sourceCode) {
	return function * (fixer) {
		const assignmentExpression = node.parent.parent;
		const exported = node.parent.property.name;
		const local = assignmentExpression.right.name;
		yield fixer.replaceText(assignmentExpression, `export {${local} as ${exported}}`);

		yield * removeParentheses(assignmentExpression, fixer, sourceCode);
	};
}

function fixExports(node, sourceCode) {
	// `exports = bar`
	if (isTopLevelAssignment(node)) {
		return fixDefaultExport(node, sourceCode);
	}

	// `exports.foo = bar`
	if (isNamedExport(node)) {
		return fixNamedExport(node, sourceCode);
	}
}

function fixModuleExports(node, sourceCode) {
	if (isModuleExports(node)) {
		return fixExports(node.parent, sourceCode);
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
			yield removeSpacesAfter(node, sourceCode, fixer);
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
		if (
			!isReferenceIdentifier(node, [
				'exports',
				'require',
				'module',
				'__filename',
				'__dirname',
			])
			|| isShadowed(sourceCode.getScope(node), node)
		) {
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
						fix: fixer => replaceReferenceIdentifier(node, replacement, fixer),
					}));

				return problem;
			}

			case 'require': {
				const fix = fixRequireCall(node, sourceCode);
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
				const fix = fixExports(node, sourceCode);
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
				const fix = fixModuleExports(node, sourceCode);
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

	context.on('MetaProperty', function * (node) {
		if (!isImportMeta(node)) {
			return;
		}

		/** @type {{parent?: import('estree').Node}} */
		const {parent} = node;
		if (
			parent.type !== 'MemberExpression'
			|| parent.object !== node
		) {
			return;
		}

		/** @type {import('estree').Node} */
		const targetNode = parent.parent;

		const propertyName = getPropertyName(parent);
		if (propertyName === 'url') {
			if (
				isCallFileURLToPath(targetNode, sourceCode)
				&& targetNode.arguments[0] === parent
			) {
				yield * processFilenameExpression(targetNode);
				// Report `fileURLToPath(import.meta.url)`
				yield buildProblemForFilename(targetNode);
				return;
			}

			if (isNewURL(targetNode, sourceCode)) {
				const urlParent = targetNode.parent;
				const isURLToPath = () => (
					(
						// `fileURLToPath(new URL(...))`
						isCallFileURLToPath(urlParent, sourceCode)
						&& urlParent.arguments[0] === targetNode
					)
					// `new URL(...).pathname`
					|| isAccessPathname(urlParent)
				);

				if (targetNode.arguments[0] === parent) {
					if (isURLToPath()) {
						yield * processFilenameExpression(urlParent);
						// Report `new URL(import.meta.url).pathname` or `fileURLToPath(new URL(import.meta.url))`
						yield buildProblemForFilename(urlParent);
					}

					return;
				}

				if (
					isLiteral(targetNode.arguments[0], '.')
					&& targetNode.arguments[1] === parent
					&& isURLToPath()) {
					// Report `new URL(".", import.meta.url).pathname` or `fileURLToPath(new URL(".", import.meta.url))`
					yield buildProblem(urlParent, 'dirname');
				}
			}

			return;
		}

		if (propertyName === 'filename') {
			yield * processFilenameExpression(parent);
			if (
				isCallPathDirname(targetNode, sourceCode)
				&& targetNode.arguments[0] === parent
			) {
				// Report `path.dirname(import.meta.filename)`
				yield buildProblem(targetNode, 'dirname');
			}
		}

		/**
		 @param { import('estree').Expression} node
		 */
		function * processFilenameExpression(node) {
			/** @type {{parent: import('estree').Node}} */
			const {parent} = node;
			if (parent.type !== 'VariableDeclarator' || parent.init !== node || parent.id.type !== 'Identifier') {
				return;
			}

			/** @type {import('eslint').Scope.Variable|null} */
			const variable = findVariable(sourceCode.getScope(parent.id), parent.id);
			if (!variable) {
				return;
			}

			for (const reference of variable.references) {
				if (!reference.isReadOnly()) {
					continue;
				}

				/** @type {{parent: import('estree').Node}} */
				const {parent} = reference.identifier;
				if (
					isCallPathDirname(parent, sourceCode)
					&& parent.arguments[0] === reference.identifier
				) {
					// Report `path.dirname(identifier)`
					yield buildProblem(parent, 'dirname');
				}
			}
		}

		/**
		 @param { import('estree').Node} node
		 */
		function buildProblemForFilename(node) {
			/** @type {{parent: import('estree').Node}} */
			const {parent} = node;
			if (
				isCallPathDirname(parent, sourceCode)
				&& parent.arguments[0] === node
			) {
				// Report `path.dirname(node)`
				return buildProblem(parent, 'dirname');
			}

			return buildProblem(node, 'filename');
		}

		/**
		 @param { import('estree').Node} node
		 @param {'dirname' | 'filename'} name
		 */
		function buildProblem(node, name) {
			const problem = {
				node,
				messageId: SUGGESTION_IMPORT_META,
				data: {name},
			};
			const fix = fixer =>
				fixer.replaceText(node, `import.meta.${name}`);

			if (filename.endsWith('.mjs')) {
				problem.fix = fix;
			} else {
				problem.suggest = [{
					messageId:
						name === 'dirname'
							? SUGGESTION_IMPORT_META_DIRNAME_FROM_URL
							: SUGGESTION_IMPORT_META_FILENAME_FROM_URL,
					fix,
				}];
			}

			return problem;
		}
	});
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer JavaScript modules (ESM) over CommonJS.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
