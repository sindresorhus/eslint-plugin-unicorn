'use strict';
const {ReferenceTracker, READ, CALL} = require("eslint-utils");
const getDocumentationUrl = require('./utils/get-documentation-url');
const isShadowed = require('./utils/is-shadowed');
const renameIdentifier = require('./utils/rename-identifier');

const METHOD_ERROR_MESSAGE_ID = 'method-error';
const METHOD_SUGGESTION_MESSAGE_ID = 'method-suggestion';
const PROPERTY_ERROR_MESSAGE_ID = 'property-error';
const messages = {
	[METHOD_ERROR_MESSAGE_ID]: 'Prefer `Number.{{property}}()` over `{{name}}()`.',
	[METHOD_SUGGESTION_MESSAGE_ID]: 'Replace `{{name}}()` with `Number.{{property}}()`.',
	[PROPERTY_ERROR_MESSAGE_ID]: 'Prefer `Number.{{property}}` over `{{name}}`.'
};

const properties = {
	// Properties
	NaN: {type: 'property'},
	Infinity: {type: 'property'},
	// Safe method
	parseInt: {type: 'method'},
	parseFloat: {type: 'method'},
	// Unsafe method
	isNaN: {type: 'method', safeToFix: false},
	isFinite: {type: 'method', safeToFix: false}
};

const isNegative = node => {
	const {parent} = node;
	return parent && parent.type === 'UnaryExpression' && parent.operator === '-' && parent.argument === node;
};

function getProblem(node, context) {
	const {name, parent} = node;
	const {type, safeToFix = true} = properties[name];
	let property = name;
	if (name === 'Infinity') {
		property = isNegative(node) ? 'NEGATIVE_INFINITY' : 'POSITIVE_INFINITY';
	}

	const messageId = type === 'property' ? PROPERTY_ERROR_MESSAGE_ID : METHOD_ERROR_MESSAGE_ID;

	const problem = {
		node,
		messageId,
		data: {
			name,
			property
		}
	};

	if (property === 'NEGATIVE_INFINITY') {
		problem.node = parent;
		problem.data.name = '-Infinity';
		problem.fix = fixer => fixer.replaceText(parent, 'Number.NEGATIVE_INFINITY');
		return problem;
	}

	const fix = fixer => renameIdentifier(node, `Number.${property}`, fixer, context.getSourceCode());

	if (!safeToFix) {
		problem.suggest = [
			{
				messageId: METHOD_SUGGESTION_MESSAGE_ID,
				data: problem.data,
				fix
			}
		];
		return problem;
	}

	problem.fix = fix;
	return problem;
}

const create = context => {
	const sourceCode = context.getSourceCode();
	const {checkInfinity} = {
		checkInfinity: true,
		...context.options[0]
	};

	const trackMap = Object.fromEntries(
		Object.entries(properties).map(([property, {type}]) =>
			[
				property,
				type === 'method' ? {[CALL]: true} : {[READ]: true}
			]
		)
	);
	if (!checkInfinity) {
		delete trackMap.Infinity;
	}

	return {
		Program() {
			const tracker = new ReferenceTracker(context.getScope());
			for (const {node, type} of tracker.iterateGlobalReferences(trackMap)) {
				const problem = getProblem(type === CALL ? node.callee : node, context);
				context.report(problem);
			}
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			checkInfinity: {
				type: 'boolean',
				default: true
			}
		},
		additionalProperties: false
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
		schema,
		messages
	}
};
