import {isRegExp} from 'node:util/types';
import {getStringIfConstant} from '@eslint-community/eslint-utils';
import {isCallExpression} from './ast/index.js';

const MESSAGE_ID = 'importStyle';
const messages = {
	[MESSAGE_ID]: 'Use {{allowedStyles}} import for module `{{moduleName}}`.',
};

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

const getAllowedImportStyles = styles =>
	new Set(Object.entries(styles).filter(([, isAllowed]) => isAllowed).map(([style]) => style));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	let [
		{
			styles: configuredStyles = {},
			stylePatterns: configuredStylePatterns = [],
			extendDefaultStyles = true,
			checkImport = true,
			checkDynamicImport = true,
			checkExportFrom = false,
			checkRequire = true,
		} = {},
	] = context.options;

	configuredStyles = extendDefaultStyles
		? Object.fromEntries([...Object.keys(defaultStyles), ...Object.keys(configuredStyles)]
			.map(name => [name, configuredStyles[name] === false ? {} : {...defaultStyles[name], ...configuredStyles[name]}]))
		: configuredStyles;

	const styles = new Map(Object.entries(configuredStyles).map(([moduleName, styles]) =>
		[moduleName, getAllowedImportStyles(styles)]));

	const stylePatterns = configuredStylePatterns.map(({pattern, styles = {}}) => ({
		pattern: isRegExp(pattern) ? pattern : new RegExp(pattern, 'u'),
		styles: getAllowedImportStyles(styles === false ? {} : styles),
	}));

	const getModuleAllowedImportStyles = moduleName => {
		if (typeof moduleName !== 'string') {
			return;
		}

		const allowedImportStyles = styles.get(moduleName);
		if (allowedImportStyles) {
			return allowedImportStyles;
		}

		for (const {pattern, styles} of stylePatterns) {
			if (pattern.test(moduleName)) {
				return styles;
			}
		}
	};

	const {sourceCode} = context;

	// eslint-disable-next-line max-params
	const report = (node, moduleName, actualImportStyles, allowedImportStyles, isRequire = false) => {
		if (!allowedImportStyles || allowedImportStyles.size === 0) {
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
			allowedStyles: new Intl.ListFormat('en-US', {type: 'disjunction'}).format([...allowedImportStyles.keys()]),
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

			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
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
			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
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

			const assignmentTargetNode = node.id;
			const moduleNameNode = node.init.argument.source;
			const moduleName = getStringIfConstant(moduleNameNode, sourceCode.getScope(moduleNameNode));

			if (!moduleName) {
				return;
			}

			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
			const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});
	}

	if (checkExportFrom) {
		context.on('ExportAllDeclaration', node => {
			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
			const actualImportStyles = ['namespace'];

			report(node, moduleName, actualImportStyles, allowedImportStyles);
		});

		context.on('ExportNamedDeclaration', node => {
			if (!node.source) {
				return;
			}

			const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
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
			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
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

			const assignmentTargetNode = node.id;
			const moduleNameNode = node.init.arguments[0];
			const moduleName = getStringIfConstant(moduleNameNode, sourceCode.getScope(moduleNameNode));

			if (!moduleName) {
				return;
			}

			const allowedImportStyles = getModuleAllowedImportStyles(moduleName);
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
				styles: {
					$ref: '#/definitions/moduleStyles',
					description: 'Module import styles.',
				},
				stylePatterns: {
					type: 'array',
					description: 'Module import style patterns.',
					items: {
						type: 'object',
						additionalProperties: false,
						properties: {
							pattern: {
								anyOf: [
									{
										type: 'string',
									},
									{},
								],
							},
							styles: {
								$ref: '#/definitions/styles',
							},
						},
						required: [
							'pattern',
							'styles',
						],
					},
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
	},
};

export default config;
