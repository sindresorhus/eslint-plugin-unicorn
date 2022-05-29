'use strict';
const {ReferenceTracker} = require('eslint-utils');
const {replaceReferenceIdentifier} = require('./fix/index.js');
const {fixSpaceAroundKeyword} = require('./fix/index.js');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `Number.{{property}}` over `{{description}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{description}}` with `Number.{{property}}`.',
};

const globalObjects = {
	// Safe to replace with `Number` properties
	parseInt: true,
	parseFloat: true,
	NaN: true,
	Infinity: true,

	// Unsafe to replace with `Number` properties
	isNaN: false,
	isFinite: false,
};

const isNegative = node => {
	const {parent} = node;
	return parent && parent.type === 'UnaryExpression' && parent.operator === '-' && parent.argument === node;
};

function * checkProperties({sourceCode, tracker, checkInfinity}) {
	let names = Object.keys(globalObjects);
	if (!checkInfinity) {
		names = names.filter(name => name !== 'Infinity');
	}

	const traceMap = Object.fromEntries(
		names.map(name => [name, {[ReferenceTracker.READ]: true}]),
	);

	for (const {node, path: [name]} of tracker.iterateGlobalReferences(traceMap)) {
		const {parent} = node;

		let property = name;
		if (name === 'Infinity') {
			property = isNegative(node) ? 'NEGATIVE_INFINITY' : 'POSITIVE_INFINITY';
		}

		const problem = {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				description: name,
				property,
			},
		};

		if (property === 'NEGATIVE_INFINITY') {
			problem.node = parent;
			problem.data.description = '-Infinity';
			problem.fix = function * (fixer) {
				yield fixer.replaceText(parent, 'Number.NEGATIVE_INFINITY');
				yield * fixSpaceAroundKeyword(fixer, parent, sourceCode);
			};

			yield problem;
			continue;
		}

		const fix = fixer => replaceReferenceIdentifier(node, `Number.${property}`, fixer, sourceCode);
		const isSafeToFix = globalObjects[name];

		if (isSafeToFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					data: problem.data,
					fix,
				},
			];
		}

		yield problem;
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		checkInfinity,
	} = {
		checkInfinity: true,
		...context.options[0],
	};

	return {
		* 'Program:exit'() {
			const sourceCode = context.getSourceCode();
			const tracker = new ReferenceTracker(context.getScope());

			yield * checkProperties({sourceCode, tracker, checkInfinity});
		},
	};
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkInfinity: {
				type: 'boolean',
				default: true,
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number` static properties over global ones.',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		messages,
	},
};
