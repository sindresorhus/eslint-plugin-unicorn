import {isMemberExpression, isMethodCall} from './ast/index.js';
import {
	getBaseTypes,
	getTypeSymbol,
	isArray,
	isKnownNonArray,
	isLeftHandSide,
	isUnknownType,
} from './utils/index.js';

const array = 'array';
const nonArray = 'non-array';
const unknown = 'unknown';
const MESSAGE_ID_ERROR = 'prefer-array-slice/error';
const MESSAGE_ID_SUGGESTION = 'prefer-array-slice/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `Array#slice()` over `Array#splice()` when reading from the returned array.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Array#slice()`.',
};

function isIndexedAccess(node) {
	return isMemberExpression(node.parent, {
		computed: true,
		optional: false,
	})
	&& node.parent.object === node
	&& !isLeftHandSide(node.parent);
}

function isAtCall(node) {
	return isMemberExpression(node.parent, {
		property: 'at',
		optional: false,
	})
	&& node.parent.object === node
	&& isMethodCall(node.parent.parent, {
		method: 'at',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});
}

function shouldReportReceiver(node, context) {
	const type = getReceiverTypeFromTypeInformation(node, context);
	if (type === array) {
		return true;
	}

	if (type === nonArray) {
		return false;
	}

	return isArray(node, context) || !isKnownNonArray(node, context);
}

function combineUnionTypes(types) {
	if (types.every(type => type === array)) {
		return array;
	}

	if (types.includes(nonArray)) {
		return nonArray;
	}

	return unknown;
}

function combineIntersectionTypes(types) {
	if (types.includes(array)) {
		return array;
	}

	if (types.every(type => type === nonArray)) {
		return nonArray;
	}

	return unknown;
}

function getReceiverTypeFromTypeInformation(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return unknown;
	}

	try {
		return getReceiverType(
			parserServices.getTypeAtLocation(node),
			parserServices.program.getTypeChecker(),
		);
	} catch {
		return unknown;
	}
}

function getReceiverType(type, checker) {
	if (isUnknownType(type)) {
		return unknown;
	}

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();

		return constraint ? getReceiverType(constraint, checker) : unknown;
	}

	if (type.isUnion()) {
		return combineUnionTypes(type.types.map(type => getReceiverType(type, checker)));
	}

	if (type.isIntersection()) {
		return combineIntersectionTypes(type.types.map(type => getReceiverType(type, checker)));
	}

	if (checker.isArrayType(type) || checker.isTupleType(type)) {
		return array;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return getReceiverType(constraint, checker);
	}

	if (getBaseTypes(type, checker).some(type => getReceiverType(type, checker) === array)) {
		return array;
	}

	if (type.intrinsicName) {
		return nonArray;
	}

	return getTypeSymbol(type) ? nonArray : unknown;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node, {
			method: 'splice',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
			computed: false,
		})) {
			return;
		}

		if (!isIndexedAccess(node) && !isAtCall(node)) {
			return;
		}

		if (!shouldReportReceiver(node.callee.object, context)) {
			return;
		}

		return {
			node: node.callee.property,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => fixer.replaceText(node.callee.property, 'slice'),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Array#slice()` over `Array#splice()` when reading from the returned array.',
			recommended: true,
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
