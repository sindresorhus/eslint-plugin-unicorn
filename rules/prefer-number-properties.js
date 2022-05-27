'use strict';
const {ReferenceTracker} = require('eslint-utils');
const {replaceReferenceIdentifier} = require('./fix/index.js');
const {fixSpaceAroundKeyword} = require('./fix/index.js');

const METHOD_ERROR_MESSAGE_ID = 'method-error';
const METHOD_SUGGESTION_MESSAGE_ID = 'method-suggestion';
const PROPERTY_ERROR_MESSAGE_ID = 'property-error';
const messages = {
	[METHOD_ERROR_MESSAGE_ID]: 'Prefer `Number.{{name}}()` over `{{name}}()`.',
	[METHOD_SUGGESTION_MESSAGE_ID]: 'Replace `{{name}}()` with `Number.{{name}}()`.',
	[PROPERTY_ERROR_MESSAGE_ID]: 'Prefer `Number.{{property}}` over `{{identifier}}`.',
};

const methods = {
	// Safe
	parseInt: true,
	parseFloat: true,
	// Unsafe
	isNaN: false,
	isFinite: false,
};

const isNegative = node => {
	const {parent} = node;
	return parent && parent.type === 'UnaryExpression' && parent.operator === '-' && parent.argument === node;
};

function * checkMethods({sourceCode, tracker}) {
	const traceMap = Object.fromEntries(
		Object.keys(methods).map(name => [name, {[ReferenceTracker.CALL]: true}]),
	);

	for (const {node: callExpression, path: [name]} of tracker.iterateGlobalReferences(traceMap)) {
		const node = callExpression.callee;
		const isSafe = methods[name];

		const problem = {
			node,
			messageId: METHOD_ERROR_MESSAGE_ID,
			data: {
				name,
			},
		};

		const fix = fixer => replaceReferenceIdentifier(node, `Number.${name}`, fixer, sourceCode);

		if (isSafe) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: METHOD_SUGGESTION_MESSAGE_ID,
					data: {
						name,
					},
					fix,
				},
			];
		}

		yield problem;
	}
}

function * checkProperties({sourceCode, tracker, checkInfinity}) {
	const properties = checkInfinity ? ['NaN', 'Infinity'] : ['NaN'];
	const traceMap = Object.fromEntries(
		properties.map(name => [name, {[ReferenceTracker.READ]: true}]),
	);

	for (const {node, path: [name]} of tracker.iterateGlobalReferences(traceMap)) {
		const {parent} = node;

		let property = name;
		if (name === 'Infinity') {
			property = isNegative(node) ? 'NEGATIVE_INFINITY' : 'POSITIVE_INFINITY';
		}

		const problem = {
			node,
			messageId: PROPERTY_ERROR_MESSAGE_ID,
			data: {
				identifier: name,
				property,
			},
		};

		if (property === 'NEGATIVE_INFINITY') {
			problem.node = parent;
			problem.data.identifier = '-Infinity';
			problem.fix = function * (fixer) {
				yield fixer.replaceText(parent, 'Number.NEGATIVE_INFINITY');
				yield * fixSpaceAroundKeyword(fixer, parent, sourceCode);
			};
		} else {
			problem.fix = fixer => replaceReferenceIdentifier(node, `Number.${property}`, fixer, sourceCode);
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

			yield * checkMethods({sourceCode, tracker});
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
