import {findVariable} from '@eslint-community/eslint-utils';
import {
	getStaticStringValue,
	isMemberExpression,
	isCallExpression,
	isNewExpression,
	isMethodCall,
} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {getOutermostTypeScriptExpression} from './utils/index.js';

const ERROR_DIRNAME = 'error/calculate-dirname';
const ERROR_FILENAME = 'error/calculate-filename';
const messages = {
	[ERROR_DIRNAME]: 'Do not construct dirname.',
	[ERROR_FILENAME]: 'Do not construct filename using `fileURLToPath()`.',
};

const isImportMeta = node =>
	node.type === 'MetaProperty'
	&& node.meta.name === 'import'
	&& node.property.name === 'meta';

const getPropertyName = (key, computed = false) => !computed && key.type === 'Identifier'
	? key.name
	: getStaticStringValue(key);

function isNodeBuiltinModuleFunctionCall(node, {modules, functionName, sourceCode}) {
	if (!isCallExpression(node, {optional: false, argumentsLength: 1})) {
		return false;
	}

	const visited = new Set();

	return isBuiltinModuleFunctionExpression(node.callee, 'property');

	/**
	@param {import('estree').Expression} node
	*/
	function isBuiltinModuleFunctionExpression(node, checkKind) {
		if (node.type === 'MemberExpression') {
			if (!(
				checkKind === 'property'
				&& !node.optional
				&& getPropertyName(node.property, node.computed) === functionName
			)) {
				return false;
			}

			return isBuiltinModuleFunctionExpression(node.object, 'module');
		}

		if (node.type === 'CallExpression') {
			if (checkKind !== 'module') {
				return false;
			}

			// `process.getBuiltinModule('x')`
			return (
				isMethodCall(node, {
					object: 'process',
					argumentsLength: 1,
					optionalMember: false,
					optionalCall: false,
				})
				&& getPropertyName(node.callee.property, node.callee.computed) === 'getBuiltinModule'
				&& isModuleLiteral(node.arguments[0])
			);
		}

		if (node.type !== 'Identifier') {
			return false;
		}

		if (visited.has(node)) {
			return false;
		}

		visited.add(node);

		const variable = findVariable(sourceCode.getScope(node), node);
		if (!variable || variable.defs.length !== 1) {
			return false;
		}

		return isBuiltinModuleFunctionDefinition(variable.defs[0], checkKind);
	}

	/**
	@param {import('eslint').Scope.Definition} define
	*/
	function isBuiltinModuleFunctionDefinition(define, checkKind) {
		if (define.type === 'ImportBinding') {
			if (!isModuleLiteral(define.parent.source)) {
				return false;
			}

			const specifier = define.node;
			return checkKind === 'module'
				? (specifier?.type === 'ImportDefaultSpecifier' || specifier?.type === 'ImportNamespaceSpecifier')
				: (specifier?.type === 'ImportSpecifier' && getPropertyName(specifier.imported) === functionName);
		}

		return define.type === 'Variable' && isBuiltinModuleFunctionPattern(define.name, checkKind);
	}

	/**
	@param {import('estree').Identifier | import('estree').ObjectPattern} node
	*/
	function isBuiltinModuleFunctionPattern(node, checkKind) {
		/**
		@type {{parent?: import('estree').Node}}
		*/
		const {parent} = node;
		if (parent.type === 'VariableDeclarator') {
			if (
				!parent.init
				|| parent.id !== node
				|| parent.parent.type !== 'VariableDeclaration'
				|| parent.parent.kind !== 'const'
			) {
				return false;
			}

			return isBuiltinModuleFunctionExpression(parent.init, checkKind);
		}

		if (parent.type === 'Property') {
			if (!(
				checkKind === 'property'
				&& parent.value === node
				&& getPropertyName(parent.key, parent.computed) === functionName
			)) {
				return false;
			}

			// Check for ObjectPattern
			return isBuiltinModuleFunctionPattern(parent.parent, 'module');
		}

		return false;
	}

	function isModuleLiteral(node) {
		return modules.has(getStaticStringValue(node));
	}
}

/**
@returns {node is import('estree').SimpleCallExpression}
*/
function isUrlFileURLToPathCall(node, sourceCode) {
	return isNodeBuiltinModuleFunctionCall(node, {
		modules: new Set(['url', 'node:url']),
		functionName: 'fileURLToPath',
		sourceCode,
	});
}

/**
@returns {node is import('estree').SimpleCallExpression}
*/
function isPathDirnameCall(node, sourceCode) {
	return isNodeBuiltinModuleFunctionCall(node, {
		modules: new Set(['path', 'node:path']),
		functionName: 'dirname',
		sourceCode,
	});
}

function create(context) {
	const {sourceCode} = context;

	context.on('MetaProperty', function * (node) {
		if (!isImportMeta(node)) {
			return;
		}

		/**
		@type {import('estree').Node}
		*/
		const memberExpression = node.parent;
		if (!isMemberExpression(memberExpression, {optional: false})) {
			return;
		}

		const propertyName = getPropertyName(memberExpression.property, memberExpression.computed);
		if (propertyName === 'url') {
			// `url.fileURLToPath(import.meta.url)` or `url.fileURLToPath(new URL(import.meta.url))`
			// Directory URLs made with `new URL('.', import.meta.url)` or `new URL('./', import.meta.url)` convert to paths with a trailing separator.
			const {parent} = memberExpression;
			const argument = isNewExpression(parent, {name: 'URL', argumentsLength: 1}) && parent.arguments[0] === memberExpression
				? parent
				: memberExpression;
			const conversion = argument.parent;
			if (
				isUrlFileURLToPathCall(conversion, sourceCode)
				&& conversion.arguments[0] === argument
			) {
				yield iterateProblemsFromFilename(conversion);
			}

			return;
		}

		if (propertyName === 'filename') {
			yield iterateProblemsFromFilename(memberExpression);
		}

		/**
		Reports legacy filename conversions and dirname calls that use the filename.
		@param {import('estree').SimpleCallExpression | import('estree').MemberExpression} node
		*/
		function * iterateProblemsFromFilename(node) {
			/**
			@type {{parent: import('estree').Node}}
			*/
			const {parent} = node;

			// `path.dirname(filename)`
			if (
				isPathDirnameCall(parent, sourceCode)
				&& parent.arguments[0] === node
			) {
				yield getProblem(parent, 'dirname');
				return;
			}

			if (node.type === 'CallExpression') {
				yield getProblem(node, 'filename');
			}

			if (
				parent.type !== 'VariableDeclarator'
				|| parent.init !== node
				|| parent.id.type !== 'Identifier'
				|| parent.parent.type !== 'VariableDeclaration'
				|| parent.parent.kind !== 'const'
			) {
				return;
			}

			/**
			@type {import('eslint').Scope.Variable}
			*/
			const variable = findVariable(sourceCode.getScope(parent.id), parent.id);

			for (const reference of variable.references) {
				if (!reference.isReadOnly()) {
					continue;
				}

				/**
				@type {{parent: import('estree').Node}}
				*/
				const {parent} = reference.identifier;
				if (
					isPathDirnameCall(parent, sourceCode)
					&& parent.arguments[0] === reference.identifier
				) {
					// Report `path.dirname(identifier)`
					yield getProblem(parent, 'dirname');
				}
			}
		}

		/**
		@param {import('estree').Node} node
		@param {'dirname' | 'filename'} name
		*/
		function getProblem(node, name) {
			return {
				node,
				messageId: name === 'dirname' ? ERROR_DIRNAME : ERROR_FILENAME,
				* fix(fixer, {abort}) {
					// The call is replaced as a whole, a comment inside it would be dropped
					if (sourceCode.getCommentsInside(node).length > 0) {
						return abort();
					}

					const {parent} = getOutermostTypeScriptExpression(node);
					if (parent.type === 'UnaryExpression' && parent.operator === 'delete') {
						// Replacing the call with a property access would delete that property.
						return abort();
					}

					yield fixer.replaceText(node, `import.meta.${name}`);
					yield fixSpaceAroundKeyword(fixer, node, context);
				},
			};
		}
	});
}

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `import.meta.{dirname,filename}` over legacy techniques for getting file paths.',
			recommended: false,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
