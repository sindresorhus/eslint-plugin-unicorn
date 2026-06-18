import {getStringIfConstant} from '@eslint-community/eslint-utils';
import {isCallExpression} from './ast/index.js';

const MESSAGE_ID = 'importStyle';
const MESSAGE_ID_BANNED = 'importStyleBanned';
const messages = {
	[MESSAGE_ID]: 'Use {{allowedStyles}} import for module `{{moduleName}}`.',
	[MESSAGE_ID_BANNED]: 'All import styles are disabled for module `{{moduleName}}`. Use the `no-restricted-imports` rule to disallow a module.',
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
		if (specifier.type !== 'ExportSpecifier') {
			continue;
		}

		if (specifier.exported.type === 'Identifier' && specifier.exported.name === 'default') {
			styles.add('default');
			continue;
		}

		styles.add('named');
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

const getModuleStyleName = moduleName =>
	typeof moduleName === 'string' && moduleName.startsWith(NODE_PROTOCOL)
		? moduleName.slice(NODE_PROTOCOL.length)
		: moduleName;

// Keep this alphabetically sorted for easier maintenance
const defaultStyles = {
	chalk: {
		default: true,
	},
	path: {
		default: true,
	},
	util: {
		named: true,
	},
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	let [
		{
			styles = {},
			extendDefaultStyles = true,
			checkImport = true,
			checkDynamicImport = true,
			checkExportFrom = false,
			checkRequire = true,
		} = {},
	] = context.options;

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

	const report = (node, moduleName, actualImportStyles, isRequire = false) => {
		const moduleStyleName = getModuleStyleName(moduleName);
		const allowedImportStyles = styles.get(moduleStyleName);

		if (!allowedImportStyles) {
			return;
		}

		if (allowedImportStyles.size === 0) {
			if (bannedModules.has(moduleStyleName)) {
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
			const actualImportStyles = getActualImportDeclarationStyles(node);

			report(node, moduleName, actualImportStyles);
		});
	}

	if (checkDynamicImport) {
		context.on('ImportExpression', node => {
			if (isAssignedDynamicImport(node)) {
				return;
			}

			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));
			const actualImportStyles = ['unassigned'];

			report(node, moduleName, actualImportStyles);
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
			const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

			report(node, moduleName, actualImportStyles);
		});
	}

	if (checkExportFrom) {
		context.on('ExportAllDeclaration', node => {
			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			const actualImportStyles = ['namespace'];

			report(node, moduleName, actualImportStyles);
		});

		context.on('ExportNamedDeclaration', node => {
			if (!node.source) {
				return;
			}

			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			const actualImportStyles = getActualExportDeclarationStyles(node);

			report(node, moduleName, actualImportStyles);
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
			const actualImportStyles = ['unassigned'];

			report(node, moduleName, actualImportStyles, true);
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
			const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

			report(node, moduleName, actualImportStyles, true);
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
