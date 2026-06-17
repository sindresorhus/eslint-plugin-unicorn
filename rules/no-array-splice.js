import {findVariable} from '@eslint-community/eslint-utils';
import {isCallOrNewExpression, isMethodCall} from './ast/index.js';
import {
	isValueNotUsable,
	shouldSkipKnownNonArrayReceiver,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {getUnnecessarySpliceReplacement} from './shared/splice-replacements.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';

const messages = {
	[MESSAGE_ID_ERROR]: 'Use `Array#toSpliced()` instead of `Array#splice()`.',
	[MESSAGE_ID_SUGGESTION]: 'Assign the `.toSpliced()` result back to the array.',
};

// Methods that always return a new array, so a variable initialized with one of
// these provably owns a fresh array. In-place methods (`reverse`, `sort`, `fill`,
// `copyWithin`, `splice`) and ambiguous ones (`slice`/`concat` can be `String`'s)
// are intentionally excluded.
const newArrayMethods = [
	'filter',
	'flat',
	'flatMap',
	'map',
	'toReversed',
	'toSorted',
	'toSpliced',
	'with',
];

// Whether the variable is a reassignable local (`let`/`var`) initialized with a
// freshly-created array. Reassigning such a variable to `array.toSpliced(…)` is
// observationally equivalent to an in-place `splice()` because the scope owns the
// only reference to the array.
function isFreshLocalArrayInit(variable) {
	const [definition] = variable.defs;

	if (
		!definition
		// A redeclared `var` may be reinitialized with a non-fresh array later.
		|| variable.defs.length !== 1
		|| variable.scope.type === 'global'
		|| definition.type !== 'Variable'
		|| definition.node.id.type !== 'Identifier'
		|| (definition.parent.kind !== 'let' && definition.parent.kind !== 'var')
	) {
		return false;
	}

	const init = definition.node.init && unwrapTypeScriptExpression(definition.node.init);

	if (!init) {
		return false;
	}

	return init.type === 'ArrayExpression'
		|| isCallOrNewExpression(init, {name: 'Array', optional: false})
		|| isMethodCall(init, {
			object: 'Array',
			methods: ['from', 'of'],
			optionalCall: false,
			optionalMember: false,
		})
		|| isMethodCall(init, {
			methods: newArrayMethods,
			optionalCall: false,
			optionalMember: false,
		});
}

// Whether any reference to the variable lets the array object escape the current
// scope, so an outside holder could observe the difference between an in-place
// `splice()` and a `toSpliced()` reassignment. Reads that keep the object local
// (member access, spread, `for…of`) are safe.
function isEscapingArrayReference(variable, receiver) {
	for (const reference of variable.references) {
		if (reference.init || reference.identifier === receiver) {
			continue;
		}

		// A later write reassigns the variable, so it no longer holds the fresh array.
		if (reference.isWrite()) {
			return true;
		}

		const {identifier} = reference;
		const {parent} = identifier;

		if (
			(parent.type === 'MemberExpression' && parent.object === identifier)
			|| (parent.type === 'SpreadElement' && parent.argument === identifier)
			|| (parent.type === 'ForOfStatement' && parent.right === identifier)
		) {
			continue;
		}

		return true;
	}

	return false;
}

function getReceiverIdentifier(node) {
	const unwrappedNode = unwrapTypeScriptExpression(node);

	return unwrappedNode.type === 'Identifier' ? unwrappedNode : undefined;
}

function isPlainArrayTypeAnnotation(node) {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isPlainArrayTypeAnnotation(node.typeAnnotation);
		}

		case 'TSArrayType': {
			return true;
		}

		case 'TSTypeReference': {
			return node.typeName.type === 'Identifier' && node.typeName.name === 'Array';
		}

		default: {
			return false;
		}
	}
}

function hasTypeParameterOrTuple(type, checker) {
	if (type.isTypeParameter?.() || checker.isTupleType(type)) {
		return true;
	}

	if (type.isUnion() || type.isIntersection()) {
		return type.types.some(type => hasTypeParameterOrTuple(type, checker));
	}

	return false;
}

function isTypeParameterOrTuple(node, context) {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return false;
	}

	try {
		const type = parserServices.getTypeAtLocation(node);
		const checker = parserServices.program.getTypeChecker();

		return hasTypeParameterOrTuple(type, checker);
	} catch {
		return false;
	}
}

function shouldSkipReceiver(node, variable, context) {
	const [definition] = variable.defs;
	const typeAnnotation = definition?.name?.typeAnnotation;

	// A non-plain-array annotation (tuple, readonly array, alias, …) means the
	// receiver may not be a reassignable plain array, so skip it.
	if (typeAnnotation && !isPlainArrayTypeAnnotation(typeAnnotation)) {
		return true;
	}

	return isTypeParameterOrTuple(node, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (
			!isValueNotUsable(callExpression)
			|| !isMethodCall(callExpression, {
				method: 'splice',
				optionalCall: false,
				optionalMember: false,
				computed: false,
			})
		) {
			return;
		}

		const {object, property} = callExpression.callee;
		const receiver = getReceiverIdentifier(object);

		if (
			!receiver
			|| getUnnecessarySpliceReplacement(callExpression)
			|| shouldSkipKnownNonArrayReceiver(object, context)
		) {
			return;
		}

		const variable = findVariable(context.sourceCode.getScope(receiver), receiver);

		if (
			!variable
			|| !isFreshLocalArrayInit(variable)
			|| shouldSkipReceiver(object, variable, context)
			|| isEscapingArrayReference(variable, receiver)
		) {
			return;
		}

		const receiverText = context.sourceCode.getText(receiver);

		return {
			node: property,
			messageId: MESSAGE_ID_ERROR,
			suggest: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix: fixer => [
						fixer.insertTextBefore(callExpression, `${receiverText} = `),
						fixer.replaceText(property, 'toSpliced'),
					],
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
			description: 'Prefer `Array#toSpliced()` over `Array#splice()`.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
