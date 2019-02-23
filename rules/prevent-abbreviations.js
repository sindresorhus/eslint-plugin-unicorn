'use strict';
const defaultsDeep = require('lodash.defaultsdeep');
const toPairs = require('lodash.topairs');

const getDocsUrl = require('./utils/get-docs-url');
const avoidCapture = require('./utils/avoid-capture');

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
	}
};

const prepareOptions = ({
	checkPropertyNames = true,
	extendDefaultReplacements = true,
	replacements = {}
} = {}) => {
	const mergedReplacements = extendDefaultReplacements ?
		defaultsDeep({}, replacements, defaultReplacements) :
		replacements;

	return {
		checkPropertyNames,
		replacements: new Map(toPairs(mergedReplacements).map(([discouragedName, replacements]) => {
			return [discouragedName, new Map(toPairs(replacements))];
		}))
	};
};

const normalizeName = name => {
	// Leading underscores are commonly used to flag private/protected identifiers,
	// Trailing underscores are used as a common way to avoid name collision.
	// We strip them before checking if the name is discouraged.
	name = name.replace(/^_+|_+$/gu, '');

	return name;
};

const getNameReplacements = (replacements, name) => {
	const normalizedName = normalizeName(name);
	const variableNameReplacements = replacements.get(normalizedName);

	if (!variableNameReplacements) {
		return [];
	}

	return [...variableNameReplacements.keys()]
		.filter(name => variableNameReplacements.get(name))
		.sort();
};

const scopeHasArgumentsSpecial = scope => {
	while (scope) {
		if (scope.taints.get('arguments')) {
			return true;
		}

		scope = scope.upper;
	}

	return false;
};

const collideWithArgumentsSpecial = (names, scopes) => {
	if (!names.includes('arguments')) {
		return false;
	}

	return scopes.some(scopeHasArgumentsSpecial) ||
		scopes.some(scope => scope.isStrict);
};

const anotherNameMessage = 'A more descriptive name will do too.';

const formatMessage = (discouragedName, replacements, nameTypeText) => {
	const message = [];

	if (replacements.length === 1) {
		message.push(`The ${nameTypeText} \`${discouragedName}\` should be named \`${replacements[0]}\`.`);
	} else {
		const replacementsText = replacements
			.map(replacement => `\`${replacement}\``)
			.join(', ');

		message.push(`Please rename the ${nameTypeText} \`${discouragedName}\`.`);
		message.push(`Suggested names are: ${replacementsText}.`);
	}

	message.push(anotherNameMessage);

	return message.join(' ');
};

const variableIdentifiers = variable => [
	...variable.identifiers,
	...variable.references
		.filter(reference => !reference.init)
		.map(reference => reference.identifier)
];

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
		identifier.parent.shorthand;
};

const isShorthandImportIdentifier = identifier => {
	return identifier.parent.type === 'ImportSpecifier' &&
		identifier.parent.imported === identifier &&
		identifier.parent.local === identifier;
};

const isShorthandExportIdentifier = identifier => {
	return identifier.parent.type === 'ExportSpecifier' &&
		identifier.parent.exported === identifier &&
		identifier.parent.local === identifier;
};

const fixIdentifier = (fixer, replacement) => identifier => {
	if (isShorthandPropertyIdentifier(identifier)) {
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
		checkPropertyNames,
		replacements
	} = prepareOptions(context.options[0]);

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

	const checkVariable = variable => {
		const variableReplacements = getNameReplacements(replacements, variable.name);

		if (variableReplacements.length === 0) {
			return;
		}

		if (variable.defs.length === 0) {
			return;
		}

		const scopes = variable.references.map(reference => reference.from).concat(variable.scope);

		if (collideWithArgumentsSpecial(variableReplacements, scopes)) {
			return;
		}

		const [definition] = variable.defs;

		const problem = {
			node: definition.name,
			message: formatMessage(definition.name.name, variableReplacements, 'variable')
		};

		if (variableReplacements.length === 1 && shouldFix(variable)) {
			const [replacement] = variableReplacements;
			const captureAvoidingReplacement = avoidCapture(replacement, scopes);

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
			if (!checkPropertyNames) {
				return;
			}

			const identifierReplacements = getNameReplacements(replacements, node.name);

			if (identifierReplacements.length === 0) {
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

		'Program:exit'() {
			checkScope(context.getScope());
		}
	};
};

const schema = [{
	type: 'object',
	properties: {
		checkPropertyNames: {type: 'boolean'},
		extendDefaultReplacements: {type: 'boolean'},
		replacements: {$ref: '#/items/0/definitions/abbreviations'}
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
				{
					type: 'object',
					additionalProperties: {type: 'boolean'}
				}
			]
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
