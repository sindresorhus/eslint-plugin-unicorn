import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {
	getAvailableVariableName,
	getScopes,
	isShorthandPropertyValue,
	lowerFirst,
	upperFirst,
} from './utils/index.js';
import {
	isClassVariable,
	shouldCheckDefaultOrNamespaceImportName,
	shouldCheckShorthandImportName,
	shouldRenameVariable,
	shouldReportIdentifierAsProperty,
} from './shared/identifier-checks.js';
import {renameVariable} from './fix/index.js';

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
	downLoad: 'download',
	feedBack: 'feedback',
	foreGround: 'foreground',
	frameWork: 'framework',
	headLine: 'headline',
	keyBoard: 'keyboard',
	keyFrame: 'keyframe',
	lifeCycle: 'lifecycle',
	metaData: 'metadata',
	midPoint: 'midpoint',
	nameSpace: 'namespace',
	newLine: 'newline',
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
	subTitle: 'subtitle',
	timeOut: 'timeout',
	timeStamp: 'timestamp',
	toolBar: 'toolbar',
	toolKit: 'toolkit',
	toolTip: 'tooltip',
	touchScreen: 'touchscreen',
	unSubscribe: 'unsubscribe',
	underScore: 'underscore',
	upLoad: 'upload',
	userName: 'username',
	viewPort: 'viewport',
	webCam: 'webcam',
	webHook: 'webhook',
	webSite: 'website',
	weekEnd: 'weekend',
	whiteSpace: 'whitespace',
	wildCard: 'wildcard',
	workFlow: 'workflow',
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

	allowList = {},
} = {}) => {
	const mergedReplacements = extendDefaultReplacements
		? {...defaultReplacements, ...replacements}
		: replacements;

	return {
		checkProperties,
		checkVariables,

		checkDefaultAndNamespaceImports,
		checkShorthandImports,
		checkShorthandProperties,

		replacements: new Map(Object.entries(mergedReplacements).filter(([, replacement]) => replacement !== false)),
		allowList: new Set(Object.keys(allowList)),
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
	if (isUpperCase(name) || allowList.has(name)) {
		return;
	}

	const boundary = String.raw`(?=$|[\d_$]|\p{Uppercase_Letter})`;
	let replacement = name;
	for (const discouragedName of replacements.keys()) {
		const pattern = new RegExp(`^${escapeRegExp(discouragedName)}${boundary}|${escapeRegExp(upperFirst(discouragedName))}${boundary}`, 'gv');
		replacement = replacement.replaceAll(pattern, part => getReplacementForPart(part, replacements));
	}

	if (replacement === name) {
		return;
	}

	return replacement;
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

		if (!shouldCheckDefaultOrNamespaceImportName(definition, options)) {
			return;
		}

		if (!shouldCheckShorthandImportName(definition, options, context)) {
			return;
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

	const isTSParameterPropertyName = node => {
		if (options.checkVariables) {
			return false;
		}

		if (node.parent.type === 'TSParameterProperty') {
			return node.parent.parameter === node;
		}

		return (
			node.parent.type === 'AssignmentPattern'
			&& node.parent.left === node
			&& node.parent.parent.type === 'TSParameterProperty'
			&& node.parent.parent.parameter === node.parent
		);
	};

	const checkProperty = node => {
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

		if (node.parent.type === 'ExportSpecifier') {
			return;
		}

		if (
			!isTSParameterPropertyName(node)
			&& !shouldReportIdentifierAsProperty(node)
		) {
			return;
		}

		const problem = createProblem(node, replacement);

		context.report(problem);
	};

	context.on('Identifier', checkProperty);
	context.on('PrivateIdentifier', checkProperty);
	// eslint-disable-next-line no-warning-comments
	// TODO: Consider expanding beyond JavaScript identifiers after this rule has proven itself.

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
					anyOf: [
						{
							type: 'boolean',
						},
						{
							enum: [
								'internal',
							],
						},
					],
					description: 'Whether to check default and namespace import names.',
				},
				checkShorthandImports: {
					anyOf: [
						{
							type: 'boolean',
						},
						{
							enum: [
								'internal',
							],
						},
					],
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
				allowList: {
					$ref: '#/definitions/trueObject',
					description: 'Custom allow list of names.',
				},
			},
		},
	],
	definitions: {
		replacements: {
			type: 'object',
			propertyNames: {
				minLength: 1,
			},
			additionalProperties: {
				anyOf: [
					{
						enum: [
							false,
						],
					},
					{
						type: 'string',
						minLength: 1,
					},
				],
			},
		},
		trueObject: {
			type: 'object',
			propertyNames: {
				minLength: 1,
			},
			additionalProperties: {
				enum: [
					true,
				],
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
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
