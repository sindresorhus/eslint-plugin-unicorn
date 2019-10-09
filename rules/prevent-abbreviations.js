'use strict';
const path = require('path');
const astUtils = require('eslint-ast-utils');
const defaultsDeep = require('lodash.defaultsdeep');
const toPairs = require('lodash.topairs');

const getDocsUrl = require('./utils/get-docs-url');
const avoidCapture = require('./utils/avoid-capture');
const cartesianProductSamples = require('./utils/cartesian-product-samples');

const isUpperCase = string => string === string.toUpperCase();
const isUpperFirst = string => isUpperCase(string[0]);
const lowerFirst = string => string[0].toLowerCase() + string.slice(1);
const upperFirst = string => string[0].toUpperCase() + string.slice(1);

const defaultReplacements = {
	err: {
		error: true
	},
	cb: {
		callback: true
	},
	opts: {
		options: true
	},
	str: {
		string: true
	},
	obj: {
		object: true
	},
	num: {
		number: true
	},
	val: {
		value: true
	},
	e: {
		event: true,
		error: true
	},
	evt: {
		event: true
	},
	el: {
		element: true
	},
	req: {
		request: true
	},
	res: {
		response: true,
		result: true
	},
	btn: {
		button: true
	},
	msg: {
		message: true
	},
	len: {
		length: true
	},
	env: {
		environment: true
	},
	dev: {
		development: true
	},
	prod: {
		production: true
	},
	tmp: {
		temporary: true
	},
	arg: {
		argument: true
	},
	args: {
		arguments: true
	},
	param: {
		parameter: true
	},
	params: {
		parameters: true
	},
	tbl: {
		table: true
	},
	db: {
		database: true
	},
	ctx: {
		context: true
	},
	mod: {
		module: true
	},
	prop: {
		property: true
	},
	arr: {
		array: true
	},
	ret: {
		returnValue: true
	},
	retval: {
		returnValue: true
	},
	ext: {
		extension: true
	},
	exts: {
		extensions: true
	},
	lib: {
		library: true
	},
	dir: {
		directory: true,
		direction: true
	},
	dirs: {
		directories: true
	},
	ref: {
		reference: true
	},
	refs: {
		references: true
	},
	pkg: {
		package: true
	},
	sep: {
		separator: true
	},
	doc: {
		document: true
	},
	docs: {
		documents: true
	},
	elem: {
		element: true
	},
	src: {
		source: true
	},
	dest: {
		destination: true
	},
	prev: {
		previous: true
	},
	curr: {
		current: true
	},
	cur: {
		current: true
	},
	acc: {
		accumulator: true
	},
	rel: {
		relative: true,
		related: true,
		relationship: true
	},
	conf: {
		config: true
	},
	temp: {
		temporary: true
	},
	props: {
		properties: true
	},
	attr: {
		attribute: true
	},
	attrs: {
		attributes: true
	}
};

const defaultWhitelist = {
	propTypes: true,
	defaultProps: true,
	getDerivedStateFromProps: true,
	stdDev: true
};

const prepareOptions = ({
	checkProperties = false,
	checkVariables = true,

	checkDefaultAndNamespaceImports = false,
	checkShorthandImports = false,
	checkShorthandProperties = false,

	checkFilenames = true,

	extendDefaultReplacements = true,
	replacements = {},

	extendDefaultWhitelist = true,
	whitelist = {}
} = {}) => {
	const mergedReplacements = extendDefaultReplacements ?
		defaultsDeep({}, replacements, defaultReplacements) :
		replacements;

	const mergedWhitelist = extendDefaultWhitelist ?
		defaultsDeep({}, whitelist, defaultWhitelist) :
		whitelist;

	return {
		checkProperties,
		checkVariables,

		checkDefaultAndNamespaceImports,
		checkShorthandImports,
		checkShorthandProperties,

		checkFilenames,

		replacements: new Map(toPairs(mergedReplacements).map(([discouragedName, replacements]) => {
			return [discouragedName, new Map(toPairs(replacements))];
		})),
		whitelist: new Map(toPairs(mergedWhitelist))
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
		wordReplacement = [...replacement.keys()]
			.filter(name => replacement.get(name))
			.map(isUpperFirst(word) ? upperFirst : lowerFirst);
	}

	return wordReplacement.length > 0 ? wordReplacement.sort() : [];
};

const getNameReplacements = (name, options, limit = 3) => {
	const {whitelist} = options;

	// Skip constants and whitelist
	if (isUpperCase(name) || whitelist.get(name)) {
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
	const words = name.split(/(?=[^a-z])|(?<=[^a-zA-Z])/).filter(Boolean);

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

		message.push(`Please rename the ${nameTypeText} \`${discouragedName}\`.`);
		message.push(`Suggested names are: ${replacementsText}.`);
	}

	message.push(anotherNameMessage);

	return message.join(' ');
};

const variableIdentifiers = variable => [...(new Set([
	...variable.identifiers,
	...variable.references
		.map(reference => reference.identifier)
])).values()];

const isExportedIdentifier = identifier => {
	if (identifier.parent.type === 'VariableDeclarator' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'VariableDeclaration' &&
			identifier.parent.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (identifier.parent.type === 'FunctionDeclaration' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	if (identifier.parent.type === 'ClassDeclaration' &&
		identifier.parent.id === identifier
	) {
		return identifier.parent.parent.type === 'ExportNamedDeclaration';
	}

	return false;
};

const shouldFix = variable => {
	return !variableIdentifiers(variable).some(isExportedIdentifier);
};

const isShorthandPropertyIdentifier = identifier => {
	return identifier.parent.type === 'Property' &&
		identifier.parent.key === identifier &&
		identifier.parent.shorthand;
};

const isAssignmentPatternShorthandPropertyIdentifier = identifier => {
	return identifier.parent.type === 'AssignmentPattern' &&
		identifier.parent.left === identifier &&
		identifier.parent.parent.type === 'Property' &&
		identifier.parent.parent.key === identifier &&
		identifier.parent.parent.value === identifier.parent &&
		identifier.parent.parent.shorthand;
};

const isShorthandImportIdentifier = identifier => {
	return identifier.parent.type === 'ImportSpecifier' &&
		identifier.parent.imported.name === identifier.name &&
		identifier.parent.local.name === identifier.name;
};

const isShorthandExportIdentifier = identifier => {
	return identifier.parent.type === 'ExportSpecifier' &&
		identifier.parent.exported.name === identifier.name &&
		identifier.parent.local.name === identifier.name;
};

const fixIdentifier = (fixer, replacement) => identifier => {
	if (isShorthandPropertyIdentifier(identifier) || isAssignmentPatternShorthandPropertyIdentifier(identifier)) {
		return fixer.replaceText(identifier, `${identifier.name}: ${replacement}`);
	}

	if (isShorthandImportIdentifier(identifier)) {
		return fixer.replaceText(identifier, `${identifier.name} as ${replacement}`);
	}

	if (isShorthandExportIdentifier(identifier)) {
		return fixer.replaceText(identifier, `${replacement} as ${identifier.name}`);
	}

	return fixer.replaceText(identifier, replacement);
};

const isDefaultOrNamespaceImportName = identifier => {
	if (identifier.parent.type === 'ImportDefaultSpecifier' &&
		identifier.parent.local === identifier
	) {
		return true;
	}

	if (identifier.parent.type === 'ImportNamespaceSpecifier' &&
		identifier.parent.local === identifier
	) {
		return true;
	}

	if (identifier.parent.type === 'ImportSpecifier' &&
		identifier.parent.local === identifier &&
		identifier.parent.imported.type === 'Identifier' &&
		identifier.parent.imported.name === 'default'
	) {
		return true;
	}

	if (identifier.parent.type === 'VariableDeclarator' &&
		identifier.parent.id === identifier &&
		astUtils.isStaticRequire(identifier.parent.init)
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
	if (identifier.parent.type === 'MemberExpression' &&
		identifier.parent.property === identifier &&
		!identifier.parent.computed &&
		identifier.parent.parent.type === 'AssignmentExpression' &&
		identifier.parent.parent.left === identifier.parent
	) {
		return true;
	}

	if (identifier.parent.type === 'Property' &&
		identifier.parent.key === identifier &&
		!identifier.parent.computed &&
		!identifier.parent.shorthand && // Shorthand properties are reported and fixed as variables
		identifier.parent.parent.type === 'ObjectExpression'
	) {
		return true;
	}

	if (identifier.parent.type === 'ExportSpecifier' &&
		identifier.parent.exported === identifier &&
		identifier.parent.local !== identifier // Same as shorthand properties above
	) {
		return true;
	}

	if (identifier.parent.type === 'MethodDefinition' &&
		identifier.parent.key === identifier &&
		!identifier.parent.computed
	) {
		return true;
	}

	if (identifier.parent.type === 'ClassProperty' &&
		identifier.parent.key === identifier &&
		!identifier.parent.computed
	) {
		return true;
	}

	return false;
};

const create = context => {
	const {
		ecmaVersion
	} = context.parserOptions;
	const options = prepareOptions(context.options[0]);
	const filenameWithExtension = context.getFilename();

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
				// For which a single `variable` holds all references, unline with `class`
				const combinedReferencesVariable = {
					name: variable.name,
					scope: variable.scope,
					defs: variable.defs,
					identifiers: variable.identifiers,
					references: variable.references.concat(outerClassVariable.references)
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

		if (!options.checkDefaultAndNamespaceImports && isDefaultOrNamespaceImportName(definition.name)) {
			return;
		}

		if (!options.checkShorthandImports && isShorthandImportIdentifier(definition.name)) {
			return;
		}

		if (!options.checkShorthandProperties && isShorthandPropertyIdentifier(definition.name)) {
			return;
		}

		const variableReplacements = getNameReplacements(variable.name, options);

		if (variableReplacements.total === 0) {
			return;
		}

		const scopes = variable.references.map(reference => reference.from).concat(variable.scope);

		const problem = {
			node: definition.name,
			message: formatMessage(definition.name.name, variableReplacements, 'variable')
		};

		if (variableReplacements.total === 1 && shouldFix(variable)) {
			const [replacement] = variableReplacements.samples;
			const captureAvoidingReplacement = avoidCapture(replacement, scopes, ecmaVersion, isSafeName);

			for (const scope of scopes) {
				if (!scopeToNamesGeneratedByFixer.has(scope)) {
					scopeToNamesGeneratedByFixer.set(scope, new Set());
				}

				const generatedNames = scopeToNamesGeneratedByFixer.get(scope);
				generatedNames.add(captureAvoidingReplacement);
			}

			problem.fix = fixer => {
				return variableIdentifiers(variable)
					.map(fixIdentifier(fixer, captureAvoidingReplacement));
			};
		}

		context.report(problem);
	};

	const checkVariables = scope => {
		scope.variables.forEach(checkPossiblyWeirdClassVariable);
	};

	const checkChildScopes = scope => {
		scope.childScopes.forEach(checkScope);
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

			if (filenameWithExtension === '<input>' || filenameWithExtension === '<text>') {
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

const schema = [{
	type: 'object',
	properties: {
		checkProperties: {type: 'boolean'},
		checkVariables: {type: 'boolean'},

		checkDefaultAndNamespaceImports: {type: 'boolean'},
		checkShorthandImports: {type: 'boolean'},
		checkShorthandProperties: {type: 'boolean'},

		checkFilenames: {type: 'boolean'},

		extendDefaultReplacements: {type: 'boolean'},
		replacements: {$ref: '#/items/0/definitions/abbreviations'},

		extendDefaultWhitelist: {type: 'boolean'},
		whitelist: {$ref: '#/items/0/definitions/booleanObject'}
	},
	additionalProperties: false,
	definitions: {
		abbreviations: {
			type: 'object',
			additionalProperties: {$ref: '#/items/0/definitions/replacements'}
		},
		replacements: {
			anyOf: [
				{
					enum: [false]
				},
				{$ref: '#/items/0/definitions/booleanObject'}
			]
		},
		booleanObject: {
			type: 'object',
			additionalProperties: {type: 'boolean'}
		}
	}
}];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code',
		schema
	}
};
