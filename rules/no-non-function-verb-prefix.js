import {isRegExp} from 'node:util/types';
import {
	isNullishType,
	isTypeScriptFile,
	isUnknownType,
	getTypeSymbol,
	isDefaultLibrarySymbol,
} from './utils/index.js';

const MESSAGE_ID = 'no-non-function-verb-prefix';
const defaultVerbs = [
	'get',
	'set',
	'unset',
	'delete',
	'add',
	'remove',
	'destroy',
	'create',
];
const callable = 'callable';
const nonCallable = 'non-callable';
const unknown = 'unknown';
const defaultLibraryCallableTypeNames = new Set([
	'CallableFunction',
	'Function',
	'NewableFunction',
]);
const messages = {
	[MESSAGE_ID]: '`{{name}}` starts with `{{verb}}`, so it should be a function.',
};

const isUppercaseAscii = character => character >= 'A' && character <= 'Z';

const prepareOptions = ({
	verbs,
	ignore = [],
}) => ({
	verbs: verbs.toSorted((first, second) => second.length - first.length),
	ignore: ignore.map(pattern => isRegExp(pattern) ? pattern : new RegExp(pattern, 'u')),
});

function getVerbPrefix(name, verbs) {
	for (const verb of verbs) {
		if (
			name.startsWith(verb)
			&& isUppercaseAscii(name[verb.length])
		) {
			return verb;
		}
	}
}

function * getBindingIdentifiers(node) {
	switch (node?.type) {
		case 'Identifier': {
			yield node;
			break;
		}

		case 'RestElement': {
			yield * getBindingIdentifiers(node.argument);
			break;
		}

		case 'AssignmentPattern': {
			yield * getBindingIdentifiers(node.left);
			break;
		}

		case 'ArrayPattern': {
			for (const element of node.elements) {
				yield * getBindingIdentifiers(element);
			}

			break;
		}

		case 'ObjectPattern': {
			for (const property of node.properties) {
				yield * getBindingIdentifiers(property.type === 'Property' ? property.value : property);
			}

			break;
		}

		case 'TSParameterProperty': {
			yield * getBindingIdentifiers(node.parameter);
			break;
		}

		default: {
			break;
		}
	}
}

function isDefaultLibraryCallableType(type, program) {
	const symbol = getTypeSymbol(type);
	return defaultLibraryCallableTypeNames.has(symbol?.getName()) && isDefaultLibrarySymbol(symbol, program);
}

const isIgnoredType = type =>
	!type
	|| isUnknownType(type)
	|| isNullishType(type)
	|| type.intrinsicName === 'never';

const isCallableType = (type, program) =>
	type.getCallSignatures().length > 0
	|| type.getConstructSignatures().length > 0
	|| isDefaultLibraryCallableType(type, program);

const combineTypeCallabilities = results => {
	if (results.length === 0 || results.includes(unknown)) {
		return unknown;
	}

	return results.every(result => result === callable) ? callable : nonCallable;
};

const getUnionTypeCallability = (type, checker, program, visitedTypes) =>
	combineTypeCallabilities(
		type.types
			.filter(type => !isNullishType(type))
			.map(type => getTypeCallability(type, checker, program, visitedTypes)),
	);

const getIntersectionTypeCallability = (type, checker, program, visitedTypes) => {
	const results = type.types.map(type => getTypeCallability(type, checker, program, visitedTypes));
	return results.includes(unknown) ? unknown : nonCallable;
};

const isInDeclaredModule = (node, sourceCode) =>
	sourceCode.getAncestors(node).some(ancestor => ancestor.type === 'TSModuleDeclaration' && ancestor.declare);

function isIgnoredName(name, ignore) {
	return ignore.some(regexp => {
		regexp.lastIndex = 0;
		const isIgnored = regexp.test(name);
		regexp.lastIndex = 0;
		return isIgnored;
	});
}

function getTypeCallability(type, checker, program, visitedTypes = new Set()) {
	if (isIgnoredType(type)) {
		return unknown;
	}

	if (visitedTypes.has(type)) {
		return unknown;
	}

	visitedTypes.add(type);

	if (type.isTypeParameter?.()) {
		const constraint = type.getConstraint();
		visitedTypes.delete(type);
		return constraint ? getTypeCallability(constraint, checker, program, visitedTypes) : unknown;
	}

	if (type.isUnion()) {
		const result = getUnionTypeCallability(type, checker, program, visitedTypes);
		visitedTypes.delete(type);
		return result;
	}

	if (isCallableType(type, program)) {
		visitedTypes.delete(type);
		return callable;
	}

	if (type.isIntersection()) {
		const result = getIntersectionTypeCallability(type, checker, program, visitedTypes);
		visitedTypes.delete(type);
		return result;
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		const result = getTypeCallability(constraint, checker, program, visitedTypes);
		visitedTypes.delete(type);
		return result;
	}

	visitedTypes.delete(type);
	return nonCallable;
}

function getProblem(identifier, context, options, typeNode = identifier) {
	const verb = getVerbPrefix(identifier.name, options.verbs);
	if (!verb) {
		return;
	}

	if (isInDeclaredModule(identifier, context.sourceCode)) {
		return;
	}

	if (isIgnoredName(identifier.name, options.ignore)) {
		return;
	}

	const {parserServices} = context.sourceCode;
	let type;
	try {
		type = parserServices.getTypeAtLocation(typeNode);
	} catch {
		return;
	}

	const checker = parserServices.program.getTypeChecker();
	if (getTypeCallability(type, checker, parserServices.program) !== nonCallable) {
		return;
	}

	return {
		node: identifier,
		messageId: MESSAGE_ID,
		data: {
			name: identifier.name,
			verb,
		},
	};
}

const isTypeOnlyImport = node => node.importKind === 'type' || node.parent.importKind === 'type';
const isTypeOnlyClassField = node =>
	node.type === 'TSAbstractPropertyDefinition'
	|| node.type === 'TSAbstractAccessorProperty'
	|| node.declare
	|| node.parent.parent.declare;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	if (
		!isTypeScriptFile(context.physicalFilename)
		|| !context.sourceCode.parserServices?.program
	) {
		return;
	}

	const options = prepareOptions(context.options[0]);

	context.on('VariableDeclarator', function * (node) {
		if (node.parent.declare) {
			return;
		}

		for (const identifier of getBindingIdentifiers(node.id)) {
			yield getProblem(identifier, context, options);
		}
	});

	context.on(['ImportDefaultSpecifier', 'ImportNamespaceSpecifier', 'ImportSpecifier'], node => {
		if (isTypeOnlyImport(node)) {
			return;
		}

		return getProblem(node.local, context, options);
	});

	context.on('TSImportEqualsDeclaration', node => {
		if (node.importKind === 'type') {
			return;
		}

		return getProblem(node.id, context, options);
	});

	context.on('TSEnumDeclaration', node => {
		if (
			node.const
			|| node.declare
		) {
			return;
		}

		return getProblem(node.id, context, options);
	});

	context.on(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'], function * (node) {
		for (const parameter of node.params) {
			for (const identifier of getBindingIdentifiers(parameter)) {
				yield getProblem(identifier, context, options);
			}
		}
	});

	context.on(['AccessorProperty', 'PropertyDefinition', 'TSAbstractAccessorProperty', 'TSAbstractPropertyDefinition'], node => {
		if (
			isTypeOnlyClassField(node)
			|| node.computed
			|| (node.key.type !== 'Identifier' && node.key.type !== 'PrivateIdentifier')
		) {
			return;
		}

		return getProblem(node.key, context, options, node);
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			verbs: {
				type: 'array',
				items: {
					type: 'string',
					minLength: 1,
				},
				minItems: 0,
				uniqueItems: true,
				description: 'Function-style verb prefixes to check.',
			},
			ignore: {
				type: 'array',
				uniqueItems: true,
				description: 'Patterns to ignore.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow non-function values with function-style verb prefixes.',
			recommended: true,
			requiresTypeChecking: true,
		},
		schema,
		defaultOptions: [{verbs: defaultVerbs, ignore: []}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
