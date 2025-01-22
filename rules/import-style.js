import {getStringIfConstant} from '@eslint-community/eslint-utils';
import {isCallExpression} from './ast/index.js';
import avoidCapture from './utils/avoid-capture.js';
import {defaultsDeep} from './utils/lodash.js';

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

const specialCases = {
	react: 'React',
	'react-dom': 'ReactDOM',
	'react-router': 'ReactRouter',
	'react-router-dom': 'ReactRouterDOM',
	'prop-types': 'PropTypes',
	lodash: '_',
	'lodash-es': '_',
	jquery: '$',
	'styled-components': 'styled',
	redux: 'Redux',
	'react-redux': 'ReactRedux',
	axios: 'Axios',
	moment: 'moment',
	'date-fns': 'dateFns',
	ramda: 'R',
	rxjs: 'Rx',
	vue: 'Vue',
	angular: 'Angular',
};

/** @type {import('eslint').Rule.RuleModule} */
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
		? defaultsDeep({}, styles, defaultStyles)
		: styles;

	styles = new Map(
		Object.entries(styles).map(
			([ moduleName, styles ]) =>
				[ moduleName, new Set(Object.entries(styles).filter(([ , isAllowed ]) => isAllowed).map(([ style ]) => style)) ],
		),
	);

	const { sourceCode } = context;

	const report = (
		node,
		moduleName,
		actualImportStyles,
		allowedImportStyles,
		isRequire = false,
	) => {
		if (!allowedImportStyles || allowedImportStyles.size === 0) {
			return;
		}

		let effectiveAllowedImportStyles = allowedImportStyles;

		if (isRequire && allowedImportStyles.has('default') && !allowedImportStyles.has('namespace')) {
			effectiveAllowedImportStyles = new Set(allowedImportStyles);
			effectiveAllowedImportStyles.add('namespace');
		}

		if (actualImportStyles.every(style => effectiveAllowedImportStyles.has(style))) {
			return;
		}

		const data = {
			allowedStyles: new Intl.ListFormat('en-US', { type: 'disjunction' }).format([ ...allowedImportStyles.keys() ]),
			moduleName,
		};

		context.report({
			node,
			messageId: MESSAGE_ID,
			data,
			fix(fixer) {
				if (!allowedImportStyles.has('namespace') || allowedImportStyles.has('named')) {
					return;
				}

				const isImportDeclaration = node.type === 'ImportDeclaration';
				const isVariableDeclarator = node.type === 'VariableDeclarator';
				const isRequireCall = isCallExpression(node.init, { name: 'require' });
				const isImportExpression = node.init?.type === 'ImportExpression';
				const isVariableDeclaratorWithRequireCall = isVariableDeclarator && (isRequireCall || isImportExpression);
				const isValidNode = isImportDeclaration || isVariableDeclaratorWithRequireCall;

				if (!isValidNode) {
					return;
				}

				let importedNames = [];
				if (node.type === 'ImportDeclaration') {
					importedNames = node.specifiers
						.filter(s => s.type === 'ImportSpecifier' || s.type === 'ImportDefaultSpecifier')
						.map(s => ({
							localName: s.local.name,
							importedName: s.type === 'ImportDefaultSpecifier' ? 'default' : s.imported.name,
						}));
				} else if (node.type === 'VariableDeclarator' && node.id.type === 'ObjectPattern') {
					importedNames = node.id.properties
						.map(p => {
							if (p.type === 'RestElement') {
								return {
									localName: p.argument.name,
									importedName: undefined,
								};
							}

							return {
								localName: p.value.name,
								importedName: p.key.name,
							};
						});
				}

				if (importedNames.length === 0) {
					return;
				}

				const scope = sourceCode.getScope(node);
				const namespaceIdentifier = specialCases[ moduleName ]
					|| moduleName.replaceAll(/-./g, x => x[ 1 ].toUpperCase());

				// Check if any of the named imports match our desired namespace identifier
				const hasMatchingNamedImport = importedNames.some(
					({ localName }) => localName === namespaceIdentifier,
				);

				// Only avoid capture if there's no matching named import
				const uniqueNamespaceIdentifier = hasMatchingNamedImport
					? namespaceIdentifier
					: avoidCapture(namespaceIdentifier, [ scope ]);

				// For VariableDeclarator, we need to handle the parent VariableDeclaration
				const hasSemicolon = sourceCode.getText(
					node.type === 'VariableDeclarator' ? node.parent : node,
				).endsWith(';');

				const importFix = fixer.replaceTextRange(
					node.type === 'VariableDeclarator'
						? [ node.parent.range[ 0 ], node.parent.range[ 1 ] ]
						: [ node.range[ 0 ], node.range[ 1 ] ],
					node.type === 'ImportDeclaration'
						? `import * as ${ uniqueNamespaceIdentifier } from ${ sourceCode.getText(node.source) }${ hasSemicolon ? ';' : '' }`
						: `const ${ uniqueNamespaceIdentifier } = require(${ sourceCode.getText(
							node.type === 'VariableDeclarator' ? node.init.arguments[ 0 ] : node.arguments[ 0 ],
						) })${ hasSemicolon ? ';' : '' }`,
				);

				if (hasMatchingNamedImport) {
					return [ importFix ];
				}

				const referenceFixes = importedNames.flatMap(({ localName, importedName }) => {
					// Skip rest patterns since they should be kept as is
					if (importedName === undefined) {
						return [];
					}

					const programScope = sourceCode.getScope(sourceCode.ast);

					const getAllReferences = scope => {
						let references = scope.references.filter(
							reference => reference.identifier.name === localName
								// Skip the original declaration
								&& !(node.type === 'VariableDeclarator' && reference.identifier === node.id)
								&& !(node.type === 'VariableDeclarator' && node.id.type === 'ObjectPattern'
									&& node.id.properties.some(p => p.value === reference.identifier)),
						);

						for (const childScope of scope.childScopes) {
							references = [ ...references, ...getAllReferences(childScope) ];
						}

						return references;
					};

					const references = getAllReferences(programScope);

					return references.map(reference =>
						fixer.replaceText(reference.identifier, `${ uniqueNamespaceIdentifier }.${ importedName }`),
					);
				});

				return [ importFix, ...referenceFixes ];
			},
		});
	};

	return {
		...(checkImport
			? {
				ImportDeclaration(node) {
					const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

					const allowedImportStyles = styles.get(moduleName);
					const actualImportStyles = getActualImportDeclarationStyles(node);

					report(node, moduleName, actualImportStyles, allowedImportStyles);
				},
			}
			: {}),
		...(checkDynamicImport
			? {
				ImportExpression(node) {
					const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));
					const allowedImportStyles = styles.get(moduleName);

					if (!isAssignedDynamicImport(node)) {
						report(node, moduleName, [ 'unassigned' ], allowedImportStyles);
						return;
					}

					const variableDeclarator = node.parent.parent;
					const assignmentTargetNode = variableDeclarator.id;
					const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

					report(variableDeclarator, moduleName, actualImportStyles, allowedImportStyles);
				},
				VariableDeclarator(node) {
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

					const allowedImportStyles = styles.get(moduleName);
					const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

					report(node, moduleName, actualImportStyles, allowedImportStyles);
				},
			}
			: {}),
		...(checkExportFrom
			? {
				ExportAllDeclaration(node) {
					const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));

					const allowedImportStyles = styles.get(moduleName);
					const actualImportStyles = [ 'namespace' ];

					report(node, moduleName, actualImportStyles, allowedImportStyles);
				},
				ExportNamedDeclaration(node) {
					const moduleName = getStringIfConstant(node.source, sourceCode.getScope(node.source));
					const allowedImportStyles = styles.get(moduleName);
					const actualImportStyles = getActualExportDeclarationStyles(node);

					report(node, moduleName, actualImportStyles, allowedImportStyles);
				},
			}
			: {}),
		...(checkRequire
			? {
				CallExpression(node) {
					if (!(
						isCallExpression(node, {
							name: 'require',
							argumentsLength: 1,
							optionalCall: false,
							optionalMember: false,
						})
						&& (node.parent.type === 'ExpressionStatement' && node.parent.expression === node)
					)) {
						return;
					}

					const moduleName = getStringIfConstant(node.arguments[ 0 ], sourceCode.getScope(node.arguments[ 0 ]));
					const allowedImportStyles = styles.get(moduleName);
					const actualImportStyles = [ 'unassigned' ];

					report(node, moduleName, actualImportStyles, allowedImportStyles, true);
				},
				VariableDeclarator(node) {
					if (!(
						node.init?.type === 'CallExpression'
						&& node.init.callee.type === 'Identifier'
						&& node.init.callee.name === 'require'
					)) {
						return;
					}

					const assignmentTargetNode = node.id;
					const moduleNameNode = node.init.arguments[ 0 ];
					const moduleName = getStringIfConstant(moduleNameNode, sourceCode.getScope(moduleNameNode));

					if (!moduleName) {
						return;
					}

					const allowedImportStyles = styles.get(moduleName);
					const actualImportStyles = getActualAssignmentTargetImportStyles(assignmentTargetNode);

					report(node, moduleName, actualImportStyles, allowedImportStyles, true);
				},
			}
			: {}),
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce specific import styles per module.',
			recommended: true,
		},
		fixable: 'code',
		schema: {
			type: 'array',
			additionalItems: false,
			items: [
				{
					type: 'object',
					additionalProperties: false,
					properties: {
						checkImport: {
							type: 'boolean',
						},
						checkDynamicImport: {
							type: 'boolean',
						},
						checkExportFrom: {
							type: 'boolean',
						},
						checkRequire: {
							type: 'boolean',
						},
						extendDefaultStyles: {
							type: 'boolean',
						},
						styles: {
							$ref: '#/definitions/moduleStyles',
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
		},
		defaultOptions: [{}],
		messages,
	},
};

export default config;
