'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const defaultRules = {
	err: 'error',
	cb: 'callback',
	opts: 'options',
	str: 'string',
	obj: 'object',
	num: 'number',
	val: 'value',
	e: 'event|error',
	el: 'element',
	req: 'request',
	res: 'response|result',
	btn: 'button',
	msg: 'message',
	len: 'length',
	env: 'environment',
	dev: 'development',
	prod: 'production',
	tmp: 'temporary',
	arg: 'argument',
	tbl: 'table',
	db: 'database',
	ctx: 'context',
	mod: 'module'
};

const extendedRules = {
	elem: 'element',
	arr: 'array',
	btn: 'button',
	msg: 'message',
	len: 'length',
	tmp: 'temporary',
	ans: 'answer',
	arg: 'argument',
	rec: 'record',
	attrs: 'attributes',
	ns: 'namespace',
	prop: 'property',
	ref: 'reference',
	cmd: 'command',
	k: 'key',
	v: 'value',
	idx: 'index'
};

const rulesets = {
	default: [defaultRules],
	extended: [defaultRules, extendedRules]
};

const compileReplaceMap = (rulesetName, additionalRules) => {
	let ruleset;
	if (rulesetName === undefined) {
		rulesetName = 'default';
	}

	if (rulesetName === null) {
		ruleset = [];
	} else if (rulesets[rulesetName] === undefined) {
		throw new Error(`unknown ruleset \`${rulesetName}\``);
	} else {
		ruleset = rulesets[rulesetName].slice(0);
	}

	if (additionalRules !== null && additionalRules !== undefined) {
		ruleset.push(additionalRules);
	}

	const replaceMap = {};
	ruleset.forEach(rules => {
		Object.keys(rules).forEach(fromRule => {
			let toRule = rules[fromRule];

			if (toRule === '' || toRule === null || toRule === undefined) {
				toRule = undefined;
			} else if (toRule.includes('|')) {
				toRule = toRule.split('|').map(word => word.trim());
			}

			fromRule.split('|').forEach(word => {
				replaceMap[word.trim()] = toRule;
			});
		});
	});
	return replaceMap;
};

const findFreeName = (scope, baseName) => {
	const variables = scope.variableScope.set;
	let name = baseName;
	let index = 0;
	while (variables.has(name)) {
		index++;
		name = baseName + index;
	}

	return name;
};

const create = context => {
	const options = context.options[1] || {};
	const replaceMap = compileReplaceMap(options.baseRuleset, options.rules);

	function checkId(node, replaceId, getReferences) {
		const {name} = node;
		let betterName = replaceMap[name];
		if (betterName !== undefined && betterName !== null) {
			if (Array.isArray(betterName)) {
				context.report({
					node,
					message: `Name \`${name}\` is ambiguous, is it ${betterName.map(word => `\`${word}\``).join(' or ')} or something else`
				});
			} else {
				betterName = findFreeName(context.getScope(), betterName);
				context.report({
					node,
					fix: fixer => {
						const fixes = [];

						if (replaceId) {
							fixes.push(fixer.replaceText(node, betterName));
						}

						getReferences().forEach(reference => {
							fixes.push(fixer.replaceText(reference.identifier, betterName));
						});
						return fixes;
					},
					message: `Prefer \`${betterName}\` over \`${name}\``
				});
			}
		}
	}

	return {
		FunctionDeclaration: node => {
			context.getDeclaredVariables(node).forEach(variable => {
				checkId(variable.defs[0].name, true, () => variable.references);
			});
		},
		VariableDeclarator: node => {
			checkId(node.id, false, () => {
				return context.getDeclaredVariables(node)[0].references;
			});
		},
		CatchClause: node => {
			checkId(node.param, true, () => {
				return context.getDeclaredVariables(node)[0].references;
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
