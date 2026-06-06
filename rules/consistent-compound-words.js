import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {
	getAvailableVariableName,
	getVariableIdentifiers,
	getScopes,
	isShorthandImportLocal,
	isShorthandPropertyValue,
	lowerFirst,
	upperFirst,
} from './utils/index.js';
import {renameVariable} from './fix/index.js';
import {isStaticRequire} from './ast/index.js';

const MESSAGE_ID_ERROR = 'consistent-compound-words/error';
const MESSAGE_ID_RENAME = 'consistent-compound-words/rename';
const {isIdentifierName} = helperValidatorIdentifier;

const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{name}}`.',
	[MESSAGE_ID_RENAME]: 'Rename to `{{replacement}}`.',
};

const defaultReplacements = {
	// Ambiguous/common API spellings like `fileName`, `setUp`, `lookUp`, `onLine`, `offLine`, `styleSheet`, and `superClass` are intentionally excluded.
	backGround: 'background',
	callBack: 'callback',
	checkBox: 'checkbox',
	clipBoard: 'clipboard',
	codeBase: 'codebase',
	dataBase: 'database',
	homePage: 'homepage',
	keyBoard: 'keyboard',
	keyFrame: 'keyframe',
	metaData: 'metadata',
	nameSpace: 'namespace',
	overRide: 'override',
	passWord: 'password',
	payLoad: 'payload',
	placeHolder: 'placeholder',
	preView: 'preview',
	screenShot: 'screenshot',
	sideBar: 'sidebar',
	subClass: 'subclass',
	subDirectory: 'subdirectory',
	subDomain: 'subdomain',
	subMenu: 'submenu',
	subProcess: 'subprocess',
	subString: 'substring',
	subTree: 'subtree',
	subType: 'subtype',
	toolBar: 'toolbar',
	toolTip: 'tooltip',
	touchScreen: 'touchscreen',
	unSubscribe: 'unsubscribe',
	underScore: 'underscore',
	userName: 'username',
	viewPort: 'viewport',
	webHook: 'webhook',
	weekEnd: 'weekend',
	workSpace: 'workspace',
};

const isUpperCase = string => string === string.toUpperCase();
const isUpperFirst = string => isUpperCase(string[0]);
const regExpSyntaxCharacters = new Set(String.raw`\^$.*+?()[]{}|`);
const escapeRegExp = string => {
	let result = '';

	for (const character of string) {
		result += regExpSyntaxCharacters.has(character) ? `\\${character}` : character;
	}

	return result;
};

const prepareOptions = ({
	checkProperties = false,
	checkVariables = true,

	checkDefaultAndNamespaceImports = 'internal',
	checkShorthandImports = 'internal',
	checkShorthandProperties = false,

	extendDefaultReplacements = true,
	replacements = {},

	extendDefaultAllowList = true,
	allowList = {},
} = {}) => {
	const mergedReplacements = extendDefaultReplacements
		? {...defaultReplacements, ...replacements}
		: replacements;

	const mergedAllowList = extendDefaultAllowList
		? {...allowList}
		: allowList;

	return {
		checkProperties,
		checkVariables,

		checkDefaultAndNamespaceImports,
		checkShorthandImports,
		checkShorthandProperties,

		replacements: new Map(Object.entries(mergedReplacements).filter(([, replacement]) => replacement !== false)),
		allowList: new Map(Object.entries(mergedAllowList)),
	};
};

const getReplacementForPart = (part, replacements) => {
	const replacement = replacements.get(part) ?? replacements.get(lowerFirst(part));
	if (!replacement) {
		return;
	}

	return isUpperFirst(part) ? upperFirst(replacement) : lowerFirst(replacement);
};

const getNameReplacement = (name, {replacements, allowList}) => {
	if (isUpperCase(name) || allowList.get(name)) {
		return;
	}

	let replacement = name;
	for (const discouragedName of replacements.keys()) {
		const boundary = String.raw`(?=$|[\d_$]|\p{Uppercase_Letter})`;
		const pattern = new RegExp(`^${escapeRegExp(discouragedName)}${boundary}|${escapeRegExp(upperFirst(discouragedName))}${boundary}`, 'gv');
		replacement = replacement.replaceAll(pattern, part => getReplacementForPart(part, replacements));
	}

	if (replacement === name) {
		return;
	}

	return replacement;
};

const declarationTypes = new Set([
	'FunctionDeclaration',
	'ClassDeclaration',
	'TSTypeAliasDeclaration',
	'TSInterfaceDeclaration',
	'TSEnumDeclaration',
]);

const isExportedIdentifier = identifier => {
	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
	) {
		return (
			identifier.parent.parent.type === 'VariableDeclaration'
			&& identifier.parent.parent.parent.type === 'ExportNamedDeclaration'
		);
	}

	if (
		declarationTypes.has(identifier.parent.type)
		&& identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

const shouldRenameVariable = variable => getVariableIdentifiers(variable)
	.every(identifier =>
		!isExportedIdentifier(identifier)
		&& identifier.type !== 'JSXIdentifier');

const isDefaultOrNamespaceImportName = identifier => {
	if (
		identifier.parent.type === 'ImportDefaultSpecifier'
		&& identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportNamespaceSpecifier'
		&& identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportSpecifier'
		&& identifier.parent.local === identifier
		&& identifier.parent.imported.type === 'Identifier'
		&& identifier.parent.imported.name === 'default'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'VariableDeclarator'
		&& identifier.parent.id === identifier
		&& isStaticRequire(identifier.parent.init)
	) {
		return true;
	}

	return false;
};

const isClassVariable = variable => {
	if (variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	return definition.type === 'ClassName';
};

const shouldReportIdentifierAsProperty = identifier => {
	if (
		identifier.parent.type === 'MemberExpression'
		&& identifier.parent.property === identifier
		&& !identifier.parent.computed
		&& identifier.parent.parent.type === 'AssignmentExpression'
		&& identifier.parent.parent.left === identifier.parent
	) {
		return true;
	}

	if (
		identifier.parent.type === 'Property'
		&& identifier.parent.key === identifier
		&& !identifier.parent.computed
		&& !identifier.parent.shorthand
		&& identifier.parent.parent.type === 'ObjectExpression'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ExportSpecifier'
		&& identifier.parent.exported === identifier
		&& identifier.parent.local !== identifier
	) {
		return true;
	}

	if (
		(
			identifier.parent.type === 'MethodDefinition'
			|| identifier.parent.type === 'PropertyDefinition'
		)
		&& identifier.parent.key === identifier
		&& !identifier.parent.computed
	) {
		return true;
	}

	return false;
};

const isInternalImport = node => {
	let source = '';

	if (node.type === 'Variable') {
		source = node.node.init.arguments[0].value;
	} else if (node.type === 'ImportBinding') {
		source = node.parent.source.value;
	}

	return (
		!source.includes('node_modules')
		&& (source.startsWith('.') || source.startsWith('/'))
	);
};

const createProblem = (node, replacement) => ({
	node,
	messageId: MESSAGE_ID_ERROR,
	data: {
		name: node.name,
		replacement,
	},
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const options = prepareOptions(context.options[0]);

	const identifierToOuterClassVariable = new WeakMap();
	const scopeToNamesGeneratedByFixer = new WeakMap();
	const isSafeName = (name, scopes) => scopes.every(scope => {
		const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
		return !generatedNames || !generatedNames.has(name);
	});

	const checkPossiblyWeirdClassVariable = variable => {
		if (isClassVariable(variable)) {
			if (variable.scope.type === 'class') {
				const [definition] = variable.defs;
				const outerClassVariable = identifierToOuterClassVariable.get(definition.name);

				if (!outerClassVariable) {
					return checkVariable(variable);
				}

				const combinedReferencesVariable = {
					name: variable.name,
					scope: variable.scope,
					defs: variable.defs,
					identifiers: variable.identifiers,
					references: [...variable.references, ...outerClassVariable.references],
				};

				return checkVariable(combinedReferencesVariable);
			}

			const [definition] = variable.defs;
			identifierToOuterClassVariable.set(definition.name, variable);

			return;
		}

		return checkVariable(variable);
	};

	const checkVariable = variable => {
		if (variable.defs.length === 0) {
			return;
		}

		const [definition] = variable.defs;

		if (isDefaultOrNamespaceImportName(definition.name)) {
			if (!options.checkDefaultAndNamespaceImports) {
				return;
			}

			if (
				options.checkDefaultAndNamespaceImports === 'internal'
				&& !isInternalImport(definition)
			) {
				return;
			}
		}

		if (isShorthandImportLocal(definition.name, context)) {
			if (!options.checkShorthandImports) {
				return;
			}

			if (
				options.checkShorthandImports === 'internal'
				&& !isInternalImport(definition)
			) {
				return;
			}
		}

		if (
			!options.checkShorthandProperties
			&& isShorthandPropertyValue(definition.name)
		) {
			return;
		}

		const replacement = getNameReplacement(variable.name, options);
		if (!replacement) {
			return;
		}

		const scopes = [
			...variable.references.map(reference => reference.from),
			variable.scope,
		];
		const safeReplacement = isIdentifierName(replacement)
			? getAvailableVariableName(replacement, scopes, isSafeName)
			: undefined;
		const problem = createProblem(definition.name, safeReplacement ?? replacement);

		if (
			safeReplacement
			&& shouldRenameVariable(variable)
			&& !variable.references.some(reference => reference.vueUsedInTemplate)
		) {
			for (const scope of scopes) {
				if (!scopeToNamesGeneratedByFixer.has(scope)) {
					scopeToNamesGeneratedByFixer.set(scope, new Set());
				}

				const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
				generatedNames.add(safeReplacement);
			}

			problem.suggest = [
				{
					messageId: MESSAGE_ID_RENAME,
					data: {replacement: safeReplacement},
					fix: fixer => renameVariable(variable, safeReplacement, context, fixer),
				},
			];
		}

		context.report(problem);
	};

	const checkVariables = scope => {
		for (const variable of scope.variables) {
			checkPossiblyWeirdClassVariable(variable);
		}
	};

	const checkScope = scope => {
		const scopes = getScopes(scope);
		for (const scope of scopes) {
			checkVariables(scope);
		}
	};

	context.on('Identifier', node => {
		if (!options.checkProperties) {
			return;
		}

		if (node.name === '__proto__') {
			return;
		}

		const replacement = getNameReplacement(node.name, options);
		if (!replacement) {
			return;
		}

		if (!shouldReportIdentifierAsProperty(node)) {
			return;
		}

		const problem = createProblem(node, replacement);

		context.report(problem);
	});

	context.on('Program:exit', program => {
		if (!options.checkVariables) {
			return;
		}

		checkScope(context.sourceCode.getScope(program));
	});
};

const schema = {
	type: 'array',
	additionalItems: false,
	items: [
		{
			type: 'object',
			additionalProperties: false,
			properties: {
				checkProperties: {
					type: 'boolean',
					description: 'Whether to check property names.',
				},
				checkVariables: {
					type: 'boolean',
					description: 'Whether to check variable names.',
				},
				checkDefaultAndNamespaceImports: {
					type: [
						'boolean',
						'string',
					],
					pattern: 'internal',
					description: 'Whether to check default and namespace import names.',
				},
				checkShorthandImports: {
					type: [
						'boolean',
						'string',
					],
					pattern: 'internal',
					description: 'Whether to check shorthand import names.',
				},
				checkShorthandProperties: {
					type: 'boolean',
					description: 'Whether to check shorthand property names.',
				},
				extendDefaultReplacements: {
					type: 'boolean',
					description: 'Whether to extend the default replacements.',
				},
				replacements: {
					$ref: '#/definitions/replacements',
					description: 'Custom compound word replacements.',
				},
				extendDefaultAllowList: {
					type: 'boolean',
					description: 'Whether to extend the default allow list.',
				},
				allowList: {
					$ref: '#/definitions/booleanObject',
					description: 'Custom allow list of names.',
				},
			},
		},
	],
	definitions: {
		replacements: {
			type: 'object',
			additionalProperties: {
				anyOf: [
					{
						enum: [
							false,
						],
					},
					{
						type: 'string',
					},
				],
			},
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
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent spelling of compound words in identifiers.',
			recommended: false,
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
