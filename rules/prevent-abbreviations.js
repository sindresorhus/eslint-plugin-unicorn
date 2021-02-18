'use strict';
const path = require('path');
const {defaultsDeep, upperFirst, lowerFirst} = require('lodash');

const getDocumentationUrl = require('./utils/get-documentation-url');
const avoidCapture = require('./utils/avoid-capture');
const cartesianProductSamples = require('./utils/cartesian-product-samples');
const isShorthandPropertyIdentifier = require('./utils/is-shorthand-property-identifier');
const isShorthandImportIdentifier = require('./utils/is-shorthand-import-identifier');
const getVariableIdentifiers = require('./utils/get-variable-identifiers');
const renameIdentifier = require('./utils/rename-identifier');

const isUpperCase = string => string === string.toUpperCase();
const isUpperFirst = string => isUpperCase(string[0]);

// Keep this alphabetically sorted for easier maintenance
const defaultReplacements = {
	acc: {
		accumulator: true
	},
	arg: {
		argument: true
	},
	args: {
		arguments: true
	},
	arr: {
		array: true
	},
	attr: {
		attribute: true
	},
	attrs: {
		attributes: true
	},
	btn: {
		button: true
	},
	cb: {
		callback: true
	},
	conf: {
		config: true
	},
	ctx: {
		context: true
	},
	cur: {
		current: true
	},
	curr: {
		current: true
	},
	db: {
		database: true
	},
	dest: {
		destination: true
	},
	dev: {
		development: true
	},
	dir: {
		direction: true,
		directory: true
	},
	dirs: {
		directories: true
	},
	doc: {
		document: true
	},
	docs: {
		documentation: true,
		documents: true
	},
	e: {
		error: true,
		event: true
	},
	el: {
		element: true
	},
	elem: {
		element: true
	},
	env: {
		environment: true
	},
	envs: {
		environments: true
	},
	err: {
		error: true
	},
	ev: {
		event: true
	},
	evt: {
		event: true
	},
	ext: {
		extension: true
	},
	exts: {
		extensions: true
	},
	fn: {
		function: true
	},
	func: {
		function: true
	},
	i: {
		index: true
	},
	idx: {
		index: true
	},
	j: {
		index: true
	},
	len: {
		length: true
	},
	lib: {
		library: true
	},
	mod: {
		module: true
	},
	msg: {
		message: true
	},
	num: {
		number: true
	},
	obj: {
		object: true
	},
	opts: {
		options: true
	},
	param: {
		parameter: true
	},
	params: {
		parameters: true
	},
	pkg: {
		package: true
	},
	prev: {
		previous: true
	},
	prod: {
		production: true
	},
	prop: {
		property: true
	},
	props: {
		properties: true
	},
	ref: {
		reference: true
	},
	refs: {
		references: true
	},
	rel: {
		related: true,
		relationship: true,
		relative: true
	},
	req: {
		request: true
	},
	res: {
		response: true,
		result: true
	},
	ret: {
		returnValue: true
	},
	retval: {
		returnValue: true
	},
	sep: {
		separator: true
	},
	src: {
		source: true
	},
	stdDev: {
		standardDeviation: true
	},
	str: {
		string: true
	},
	tbl: {
		table: true
	},
	temp: {
		temporary: true
	},
	tit: {
		title: true
	},
	tmp: {
		temporary: true
	},
	val: {
		value: true
	},
	var: {
		variable: true
	},
	vars: {
		variables: true
	},
	ver: {
		version: true
	}
};

const defaultAllowList = {
	// React PropTypes
	// https://reactjs.org/docs/typechecking-with-proptypes.html
	propTypes: true,
	// React.Component Class property
	// https://reactjs.org/docs/react-component.html#defaultprops
	defaultProps: true,
	// React.Component static method
	// https://reactjs.org/docs/react-component.html#static-getderivedstatefromprops
	getDerivedStateFromProps: true,
	// Ember class name
	// https://api.emberjs.com/ember/3.10/classes/Ember.EmberENV/properties
	EmberENV: true,
	// `package.json` field
	// https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file
	devDependencies: true,
	// Jest configuration
	// https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
	setupFilesAfterEnv: true,
	// Next.js function
	// https://nextjs.org/learn/basics/fetching-data-for-pages
	getInitialProps: true
};

const prepareOptions = ({
	checkProperties = false,
	checkVariables = true,

	checkDefaultAndNamespaceImports = 'internal',
	checkShorthandImports = 'internal',
	checkShorthandProperties = false,

	checkFilenames = true,

	extendDefaultReplacements = true,
	replacements = {},

	extendDefaultWhitelist = true,
	whitelist = {},

	ignore = []
} = {}) => {
	const mergedReplacements = extendDefaultReplacements ?
		defaultsDeep({}, replacements, defaultReplacements) :
		replacements;

	const mergedWhitelist = extendDefaultWhitelist ?
		defaultsDeep({}, whitelist, defaultAllowList) :
		whitelist;

	ignore = ignore.map(
		pattern => pattern instanceof RegExp ? pattern : new RegExp(pattern, 'u')
	);

	return {
		checkProperties,
		checkVariables,

		checkDefaultAndNamespaceImports,
		checkShorthandImports,
		checkShorthandProperties,

		checkFilenames,

		replacements: new Map(
			Object.entries(mergedReplacements).map(
				([discouragedName, replacements]) =>
					[discouragedName, new Map(Object.entries(replacements))]
			)
		),
		whitelist: new Map(Object.entries(mergedWhitelist)),

		ignore
	};
};

const getWordReplacements = (word, {replacements, whitelist}) => {
	// Skip constants and whitelist
	if (isUpperCase(word) || whitelist.get(word)) {
		return [];
	}

	const replacement = replacements.get(lowerFirst(word)) ||
		replacements.get(word) ||
		replacements.get(upperFirst(word));

	let wordReplacement = [];
	if (replacement) {
		const transform = isUpperFirst(word) ? upperFirst : lowerFirst;
		wordReplacement = [...replacement.keys()]
			.filter(name => replacement.get(name))
			.map(name => transform(name));
	}

	return wordReplacement.length > 0 ? wordReplacement.sort() : [];
};

const getNameReplacements = (name, options, limit = 3) => {
	const {whitelist, ignore} = options;

	// Skip constants and whitelist
	if (isUpperCase(name) || whitelist.get(name) || ignore.some(regexp => regexp.test(name))) {
		return {total: 0};
	}

	// Find exact replacements
	const exactReplacements = getWordReplacements(name, options);

	if (exactReplacements.length > 0) {
		return {
			total: exactReplacements.length,
			samples: exactReplacements.slice(0, limit)
		};
	}

	// Split words
	const words = name.split(/(?=[^a-z])|(?<=[^A-Za-z])/).filter(Boolean);

	let hasReplacements = false;
	const combinations = words.map(word => {
		const wordReplacements = getWordReplacements(word, options);

		if (wordReplacements.length > 0) {
			hasReplacements = true;
			return wordReplacements;
		}

		return [word];
	});

	// No replacements for any word
	if (!hasReplacements) {
		return {total: 0};
	}

	const {
		total,
		samples
	} = cartesianProductSamples(combinations, limit);

	return {
		total,
		samples: samples.map(words => words.join(''))
	};
};

const anotherNameMessage = 'A more descriptive name will do too.';

const formatMessage = (discouragedName, replacements, nameTypeText) => {
	const message = [];
	const {total, samples = []} = replacements;

	if (total === 1) {
		message.push(`The ${nameTypeText} \`${discouragedName}\` should be named \`${samples[0]}\`.`);
	} else {
		let replacementsText = samples
			.map(replacement => `\`${replacement}\``)
			.join(', ');

		const omittedReplacementsCount = total - samples.length;
		if (omittedReplacementsCount > 0) {
			replacementsText += `, ... (${omittedReplacementsCount > 99 ? '99+' : omittedReplacementsCount} more omitted)`;
		}

		message.push(
			`Please rename the ${nameTypeText} \`${discouragedName}\`.`,
			`Suggested names are: ${replacementsText}.`
		);
	}

	message.push(anotherNameMessage);

	return message.join(' ');
};

const isExportedIdentifier = identifier => {
	if (
		identifier.parent.type === 'VariableDeclarator' &&
		identifier.parent.id === identifier
	) {
		return (
			identifier.parent.parent.type === 'VariableDeclaration' &&
			identifier.parent.parent.parent.type === 'ExportNamedDeclaration'
		);
	}

	if (
		identifier.parent.type === 'FunctionDeclaration' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (
		identifier.parent.type === 'ClassDeclaration' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (
		identifier.parent.type === 'TSTypeAliasDeclaration' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (
		identifier.parent.type === 'TypeAlias' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

const shouldFix = variable => {
	return !getVariableIdentifiers(variable).some(identifier => isExportedIdentifier(identifier));
};

const isStaticRequire = node => Boolean(
	node &&
	node.callee &&
	node.callee.type === 'Identifier' &&
	node.callee.name === 'require' &&
	node.arguments.length === 1 &&
	node.arguments[0].type === 'Literal' &&
	typeof node.arguments[0].value === 'string'
);

const isDefaultOrNamespaceImportName = identifier => {
	if (
		identifier.parent.type === 'ImportDefaultSpecifier' &&
		identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportNamespaceSpecifier' &&
		identifier.parent.local === identifier
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ImportSpecifier' &&
		identifier.parent.local === identifier &&
		identifier.parent.imported.type === 'Identifier' &&
		identifier.parent.imported.name === 'default'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'VariableDeclarator' &&
		identifier.parent.id === identifier &&
		isStaticRequire(identifier.parent.init)
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
		identifier.parent.type === 'MemberExpression' &&
		identifier.parent.property === identifier &&
		!identifier.parent.computed &&
		identifier.parent.parent.type === 'AssignmentExpression' &&
		identifier.parent.parent.left === identifier.parent
	) {
		return true;
	}

	if (
		identifier.parent.type === 'Property' &&
		identifier.parent.key === identifier &&
		!identifier.parent.computed &&
		!identifier.parent.shorthand && // Shorthand properties are reported and fixed as variables
		identifier.parent.parent.type === 'ObjectExpression'
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ExportSpecifier' &&
		identifier.parent.exported === identifier &&
		identifier.parent.local !== identifier // Same as shorthand properties above
	) {
		return true;
	}

	if (
		identifier.parent.type === 'MethodDefinition' &&
		identifier.parent.key === identifier &&
		!identifier.parent.computed
	) {
		return true;
	}

	if (
		identifier.parent.type === 'ClassProperty' &&
		identifier.parent.key === identifier &&
		!identifier.parent.computed
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
		!source.includes('node_modules') &&
		(source.startsWith('.') || source.startsWith('/'))
	);
};

const create = context => {
	const {ecmaVersion} = context.parserOptions;
	const options = prepareOptions(context.options[0]);
	const filenameWithExtension = context.getFilename();
	const sourceCode = context.getSourceCode();

	// A `class` declaration produces two variables in two scopes:
	// the inner class scope, and the outer one (whereever the class is declared).
	// This map holds the outer ones to be later processed when the inner one is encountered.
	// For why this is not a eslint issue see https://github.com/eslint/eslint-scope/issues/48#issuecomment-464358754
	const identifierToOuterClassVariable = new WeakMap();

	const checkPossiblyWeirdClassVariable = variable => {
		if (isClassVariable(variable)) {
			if (variable.scope.type === 'class') { // The inner class variable
				const [definition] = variable.defs;
				const outerClassVariable = identifierToOuterClassVariable.get(definition.name);

				if (!outerClassVariable) {
					return checkVariable(variable);
				}

				// Create a normal-looking variable (like a `var` or a `function`)
				// For which a single `variable` holds all references, unlike with a `class`
				const combinedReferencesVariable = {
					name: variable.name,
					scope: variable.scope,
					defs: variable.defs,
					identifiers: variable.identifiers,
					references: [...variable.references, ...outerClassVariable.references]
				};

				// Call the common checker with the newly forged normalized class variable
				return checkVariable(combinedReferencesVariable);
			}

			// The outer class variable, we save it for later, when it's inner counterpart is encountered
			const [definition] = variable.defs;
			identifierToOuterClassVariable.set(definition.name, variable);

			return;
		}

		return checkVariable(variable);
	};

	// Holds a map from a `Scope` to a `Set` of new variable names generated by our fixer.
	// Used to avoid generating duplicate names, see for instance `let errCb, errorCb` test.
	const scopeToNamesGeneratedByFixer = new WeakMap();
	const isSafeName = (name, scopes) => scopes.every(scope => {
		const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
		return !generatedNames || !generatedNames.has(name);
	});

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
				options.checkDefaultAndNamespaceImports === 'internal' &&
				!isInternalImport(definition)
			) {
				return;
			}
		}

		if (isShorthandImportIdentifier(definition.name)) {
			if (!options.checkShorthandImports) {
				return;
			}

			if (
				options.checkShorthandImports === 'internal' &&
				!isInternalImport(definition)
			) {
				return;
			}
		}

		if (
			!options.checkShorthandProperties &&
			isShorthandPropertyIdentifier(definition.name)
		) {
			return;
		}

		const variableReplacements = getNameReplacements(variable.name, options);

		if (variableReplacements.total === 0) {
			return;
		}

		const scopes = [
			...variable.references.map(reference => reference.from),
			variable.scope
		];
		variableReplacements.samples = variableReplacements.samples.map(
			name => avoidCapture(name, scopes, ecmaVersion, isSafeName)
		);

		const problem = {
			node: definition.name,
			message: formatMessage(definition.name.name, variableReplacements, 'variable')
		};

		if (variableReplacements.total === 1 && shouldFix(variable)) {
			const [replacement] = variableReplacements.samples;

			for (const scope of scopes) {
				if (!scopeToNamesGeneratedByFixer.has(scope)) {
					scopeToNamesGeneratedByFixer.set(scope, new Set());
				}

				const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
				generatedNames.add(replacement);
			}

			problem.fix = function * (fixer) {
				for (const identifier of getVariableIdentifiers(variable)) {
					yield renameIdentifier(identifier, replacement, fixer, sourceCode);
				}
			};
		}

		context.report(problem);
	};

	const checkVariables = scope => {
		for (const variable of scope.variables) {
			checkPossiblyWeirdClassVariable(variable);
		}
	};

	const checkChildScopes = scope => {
		for (const childScope of scope.childScopes) {
			checkScope(childScope);
		}
	};

	const checkScope = scope => {
		checkVariables(scope);

		return checkChildScopes(scope);
	};

	return {
		Identifier(node) {
			if (!options.checkProperties) {
				return;
			}

			if (node.name === '__proto__') {
				return;
			}

			const identifierReplacements = getNameReplacements(node.name, options);

			if (identifierReplacements.total === 0) {
				return;
			}

			if (!shouldReportIdentifierAsProperty(node)) {
				return;
			}

			const problem = {
				node,
				message: formatMessage(node.name, identifierReplacements, 'property')
			};

			context.report(problem);
		},

		Program(node) {
			if (!options.checkFilenames) {
				return;
			}

			if (
				filenameWithExtension === '<input>' ||
				filenameWithExtension === '<text>'
			) {
				return;
			}

			const extension = path.extname(filenameWithExtension);
			const filename = path.basename(filenameWithExtension, extension);
			const filenameReplacements = getNameReplacements(filename, options);

			if (filenameReplacements.total === 0) {
				return;
			}

			filenameReplacements.samples = filenameReplacements.samples.map(replacement => `${replacement}${extension}`);

			context.report({
				node,
				message: formatMessage(filenameWithExtension, filenameReplacements, 'filename')
			});
		},

		'Program:exit'() {
			if (!options.checkVariables) {
				return;
			}

			checkScope(context.getScope());
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			checkProperties: {
				type: 'boolean'
			},
			checkVariables: {
				type: 'boolean'
			},
			checkDefaultAndNamespaceImports: {
				type: [
					'boolean',
					'string'
				],
				pattern: 'internal'
			},
			checkShorthandImports: {
				type: [
					'boolean',
					'string'
				],
				pattern: 'internal'
			},
			checkShorthandProperties: {
				type: 'boolean'
			},
			checkFilenames: {
				type: 'boolean'
			},
			extendDefaultReplacements: {
				type: 'boolean'
			},
			replacements: {
				$ref: '#/items/0/definitions/abbreviations'
			},
			extendDefaultWhitelist: {
				type: 'boolean'
			},
			whitelist: {
				$ref: '#/items/0/definitions/booleanObject'
			},
			ignore: {
				type: 'array',
				uniqueItems: true
			}
		},
		additionalProperties: false,
		definitions: {
			abbreviations: {
				type: 'object',
				additionalProperties: {
					$ref: '#/items/0/definitions/replacements'
				}
			},
			replacements: {
				anyOf: [
					{
						enum: [
							false
						]
					},
					{
						$ref: '#/items/0/definitions/booleanObject'
					}
				]
			},
			booleanObject: {
				type: 'object',
				additionalProperties: {
					type: 'boolean'
				}
			}
		}
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
