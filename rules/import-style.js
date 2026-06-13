import {getStringIfConstant} from '@eslint-community/eslint-utils';
import isBuiltinModule from 'is-builtin-module';
import {isCallExpression} from './ast/index.js';

const MESSAGE_ID = 'importStyle';
const MESSAGE_ID_BANNED = 'importStyleBanned';
const MESSAGE_ID_NODE_BUILTIN_MODULES = 'nodeBuiltinModules';
const messages = {
	[MESSAGE_ID]: 'Use {{allowedStyles}} import for module `{{moduleName}}`.',
	[MESSAGE_ID_BANNED]: 'All import styles are disabled for module `{{moduleName}}`. Use the `no-restricted-imports` rule to disallow a module.',
	[MESSAGE_ID_NODE_BUILTIN_MODULES]: 'Use {{style}} import for Node.js builtin module `{{moduleName}}`.',
};
const disjunctionListFormat = new Intl.ListFormat('en-US', {type: 'disjunction'});
const NODE_PROTOCOL = 'node:';

const getActualImportDeclarationStyles = importDeclaration => {
	const {specifiers} = importDeclaration;

	if (specifiers.length === 0) {
		return ['unassigned'];
	}

	const styles = new Set();

	for (const specifier of specifiers) {
		if (specifier.type === 'ImportDefaultSpecifier') {
			styles.add('default');
			continue;
		}

		if (specifier.type === 'ImportNamespaceSpecifier') {
			styles.add('namespace');
			continue;
		}

		if (specifier.type === 'ImportSpecifier') {
			if (specifier.imported.type === 'Identifier' && specifier.imported.name === 'default') {
				styles.add('default');
				continue;
			}

			styles.add('named');
			continue;
		}
	}

	return [...styles];
};

const getActualExportDeclarationStyles = exportDeclaration => {
	const {specifiers} = exportDeclaration;

	if (specifiers.length === 0) {
		return ['unassigned'];
	}

	const styles = new Set();

	for (const specifier of specifiers) {
		if (specifier.type === 'ExportSpecifier') {
			if (specifier.exported.type === 'Identifier' && specifier.exported.name === 'default') {
				styles.add('default');
				continue;
			}

			styles.add('named');
			continue;
		}
	}

	return [...styles];
};

const getActualAssignmentTargetImportStyles = assignmentTarget => {
	if (assignmentTarget.type === 'Identifier' || assignmentTarget.type === 'ArrayPattern') {
		return ['namespace'];
	}

	if (assignmentTarget.type === 'ObjectPattern') {
		if (assignmentTarget.properties.length === 0) {
			return ['unassigned'];
		}

		const styles = new Set();

		for (const property of assignmentTarget.properties) {
			if (property.type === 'RestElement') {
				styles.add('named');
				continue;
			}

			if (property.key.type === 'Identifier') {
				if (property.key.name === 'default') {
					styles.add('default');
				} else {
					styles.add('named');
				}
			}
		}

		return [...styles];
	}

	// Next line is not test-coverable until unforceable changes to the language
	// like an addition of new AST node types usable in `const __HERE__ = foo;`.
	// An exotic custom parser or a bug in one could cover it too.
	/* c8 ignore next */
	return [];
};

const isAssignedDynamicImport = node =>
	node.parent.type === 'AwaitExpression'
	&& node.parent.argument === node
	&& node.parent.parent.type === 'VariableDeclarator'
	&& node.parent.parent.init === node.parent;

const isNodeBuiltinModule = moduleName =>
	typeof moduleName === 'string'
	&& moduleName.startsWith(NODE_PROTOCOL)
	&& isBuiltinModule(moduleName);

const isDefaultImportSpecifier = specifier =>
	specifier.type === 'ImportDefaultSpecifier'
	|| (
		specifier.type === 'ImportSpecifier'
		&& specifier.imported.type === 'Identifier'
		&& specifier.imported.name === 'default'
	);

const isNamespaceImportSpecifier = specifier =>
	specifier.type === 'ImportNamespaceSpecifier';

const getNodeBuiltinModulesProblem = (node, moduleName, style) => {
	if (!(
		style
		&& isNodeBuiltinModule(moduleName)
	)) {
		return;
	}

	const isDisallowedSpecifier = style === 'namespace'
		? isDefaultImportSpecifier
		: isNamespaceImportSpecifier;
	const problemSpecifier = node.specifiers.find(specifier => isDisallowedSpecifier(specifier));

	if (!problemSpecifier) {
		return;
	}

	return {
		node: problemSpecifier,
		messageId: MESSAGE_ID_NODE_BUILTIN_MODULES,
		data: {
			style,
			moduleName,
		},
	};
};

// Keep this alphabetically sorted for easier maintenance
const defaultStyles = {
	chalk: {
		default: true,
	},
	path: {
		default: true,
	},
	'node:path': {
		default: true,
	},
	util: {
		named: true,
	},
	'node:util': {
		named: true,
	},
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	let [
		{
			styles = {},
			nodeBuiltinModules,
			extendDefaultStyles = true,
			checkImport = true,
			checkDynamicImport = true,
			checkExportFrom = false,
			checkRequire = true,
		} = {},
	] = context.options;

	const configuredModuleNames = new Set(Object.keys(styles));

	styles = extendDefaultStyles
		? Object.fromEntries([...Object.keys(defaultStyles), ...Object.keys(styles)]
			.map(name => [name, styles[name] === false ? {} : {...defaultStyles[name], ...styles[name]}]))
		: styles;

	const bannedModules = new Set(
		Object.entries(styles)
			.filter(([, moduleStyles]) => ['unassigned', 'default', 'namespace', 'named'].every(key => moduleStyles[key] === false))
			.map(([name]) => name),
	);

	styles = new Map(Object.entries(styles).map(([moduleName, styles]) =>
		[moduleName, new Set(Object.entries(styles).filter(([, isAllowed]) => isAllowed).map(([style]) => style))]));

	const {sourceCode} = context;

	// eslint-disable-next-line max-params
	const report = (node, moduleName, actualImportStyles, allowedImportStyles, isRequire = false) => {
		if (!allowedImportStyles) {
			return;
		}

		if (allowedImportStyles.size === 0) {
			if (bannedModules.has(moduleName)) {
				context.report({
					node,
					messageId: MESSAGE_ID_BANNED,
					data: {moduleName},
				});
			}

			return;
		}

		let effectiveAllowedImportStyles = allowedImportStyles;

		// For `require`, `'default'` style allows both `x = require('x')` (`'namespace'` style) and
		// `{default: x} = require('x')` (`'default'` style) since we don't know in advance
		// whether `'x'` is a compiled ES6 module (with `default` key) or a CommonJS module and `require`
		// does not provide any automatic interop for this, so the user may have to use either of these.
		if (isRequire && allowedImportStyles.has('default') && !allowedImportStyles.has('namespace')) {
			effectiveAllowedImportStyles = new Set(allowedImportStyles);
			effectiveAllowedImportStyles.add('namespace');
		}

		if (actualImportStyles.every(style => effectiveAllowedImportStyles.has(style))) {
			return;
		}

		const data = {
			allowedStyles: disjunctionListFormat.format(allowedImportStyles.keys().toArray()),
			moduleName,
		};

		context.report({
			node,
			messageId: MESSAGE_ID,
			data,
		});
	};

	if (checkImport) {
		context.on('ImportDeclaration', node => {
			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			if (!configuredModuleNames.has(moduleName)) {
				const problem = getNodeBuiltinModulesProblem(node, moduleName, nodeBuiltinModules);

				if (problem) {
					return problem;
				}

				if (
					nodeBuiltinModules
					&& isNodeBuiltinModule(moduleName)
				) {
					return;
				}
			}

			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = getActualImportDeclarationStyles(node);

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});
	}

	if (checkDynamicImport) {
		context.on('ImportExpression', node => {
			if (isAssignedDynamicImport(node)) {
				return;
			}

			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));
			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = ['unassigned'];

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});

		context.on('VariableDeclarator', node => {
			if (!(
				node.init?.type === 'AwaitExpression'
				&& node.init.argument.type === 'ImportExpression'
			)) {
				return;
			}

			const moduleNameNode = node.init.argument.source;
			const moduleName = getStringIfConstant(moduleNameNode, sourceCode.getScope(moduleNameNode));

			if (!moduleName) {
				return;
			}

			const assignmentTargetNode = node.id;
			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});
	}

	if (checkExportFrom) {
		context.on('ExportAllDeclaration', node => {
			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = ['namespace'];

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});

		context.on('ExportNamedDeclaration', node => {
			if (!node.source) {
				return;
			}

			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = getActualExportDeclarationStyles(node);

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});
	}

	if (checkRequire) {
		context.on('CallExpression', node => {
			if (!(
				isCallExpression(node, {
					name: 'require',
					argumentsLength: 1,
					optional: false,
				})
				&& (node.parent.type === 'ExpressionStatement' && node.parent.expression === node)
			)) {
				return;
			}

			const moduleName = getStringIfConstant(node.arguments[0], sourceCode.getScope(node.arguments[0]));
			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = ['unassigned'];

			report(node, moduleName, actualImportStyles, allowedImportStyles, true);
		});

		context.on('VariableDeclarator', node => {
			if (!(
				node.init?.type === 'CallExpression'
				&& node.init.callee.type === 'Identifier'
				&& node.init.callee.name === 'require'
			)) {
				return;
			}

			const moduleNameNode = node.init.arguments[0];
			const moduleName = getStringIfConstant(moduleNameNode, sourceCode.getScope(moduleNameNode));

			if (!moduleName) {
				return;
			}

			const assignmentTargetNode = node.id;
			const allowedImportStyles = styles.get(moduleName);
			const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

			report(node, moduleName, actualImportStyles, allowedImportStyles, true);
		});
	}
};

const schema = {
	type: 'array',
	additionalItems: false,
	items: [
		{
			type: 'object',
			additionalProperties: false,
			properties: {
				checkImport: {
					type: 'boolean',
					description: 'Whether to check `import` statements.',
				},
				checkDynamicImport: {
					type: 'boolean',
					description: 'Whether to check dynamic `import()` expressions.',
				},
				checkExportFrom: {
					type: 'boolean',
					description: 'Whether to check `export … from` statements.',
				},
				checkRequire: {
					type: 'boolean',
					description: 'Whether to check `require()` calls.',
				},
				extendDefaultStyles: {
					type: 'boolean',
					description: 'Whether to extend the default styles.',
				},
				nodeBuiltinModules: {
					enum: [
						'default',
						'namespace',
					],
					description: 'The import style for Node.js builtin modules imported with the `node:` protocol.',
				},
				styles: {
					$ref: '#/definitions/moduleStyles',
					description: 'Module import styles.',
				},
			},
		},
	],
	definitions: {
		moduleStyles: {
			type: 'object',
			additionalProperties: {
				$ref: '#/definitions/styles',
			},
		},
		styles: {
			anyOf: [
				{
					enum: [
						false,
					],
				},
				{
					$ref: '#/definitions/booleanObject',
				},
			],
		},
		booleanObject: {
			type: 'object',
			additionalProperties: {
				type: 'boolean',
			},
		},
	},
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce specific import styles per module.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
