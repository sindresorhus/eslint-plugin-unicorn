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
	}
};

const prepareOptions = ({extendDefaults = true, replacements = {}} = {}) => {
	const mergedReplacements = extendDefaults ?
		defaultsDeep({}, replacements, defaultReplacements) :
		replacements;

	return new Map(toPairs(mergedReplacements).map(([discouragedName, replacements]) => {
		return [discouragedName, new Map(toPairs(replacements))];
	}));
};

const getVariableReplacements = (replacements, variable) => {
	const variableNameReplacements = replacements.get(variable.name);

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

	return scopes.some(scopeHasArgumentsSpecial);
};

const anotherNameMessage = 'A more descriptive name will do too.';

const formatMessage = (discouragedName, replacements) => {
	const message = [];

	if (replacements.length === 1) {
		message.push(`This variable should be named \`${replacements[0]}\`.`);
	} else {
		const replacementsText = replacements
			.map(replacement => `\`${replacement}\``)
			.join(', ');

		message.push('Please rename this variable.');
		message.push(`Suggested names are: ${replacementsText}.`);
	}

	message.push(anotherNameMessage);

	return message.join(' ');
};

const create = context => {
	const replacements = prepareOptions(context.options[0]);

	const checkVariable = variable => {
		const variableReplacements = getVariableReplacements(replacements, variable);

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
			message: formatMessage(definition.name, variableReplacements)
		};

		if (variableReplacements.length === 1) {
			const [replacement] = variableReplacements;
			const captureAvoidingReplacement = avoidCapture(replacement, scopes);

			problem.fix = fixer => [
				...variable.identifiers
					.map(identifier => {
						return fixer.replaceText(identifier, captureAvoidingReplacement);
					}),
				...variable.references
					.filter(reference => !reference.init)
					.map(reference => {
						return fixer.replaceText(reference.identifier, captureAvoidingReplacement);
					})
			];
		}

		context.report(problem);
	};

	const checkVariables = scope => {
		scope.variables.forEach(checkVariable);
	};

	const checkChildScopes = scope => {
		scope.childScopes.forEach(checkScope);
	};

	const checkScope = scope => {
		checkVariables(scope);

		return checkChildScopes(scope);
	};

	return {
		'Program:exit'() {
			checkScope(context.getScope());
		}
	};
};

const schema = [{
	type: 'object',
	properties: {
		extendDefaults: {type: 'boolean'},
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
