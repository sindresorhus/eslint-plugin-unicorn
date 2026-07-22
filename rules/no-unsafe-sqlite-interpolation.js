import {findVariable, getPropertyName, ReferenceTracker} from '@eslint-community/eslint-utils';
import {isStaticRequire} from './ast/index.js';
import {getConstVariableInitializer, isRuntimeImportSpecifier} from './utils/index.js';

const MESSAGE_ID = 'no-unsafe-sqlite-interpolation';
const messages = {
	[MESSAGE_ID]: 'Do not interpolate values into `node:sqlite` SQL strings.',
};

const databaseMethods = new Set([
	'exec',
	'prepare',
]);

const transparentExpressionTypes = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSNonNullExpression',
	'TSTypeAssertion',
	'TSInstantiationExpression',
]);

const databaseSyncEsmTraceMap = {
	'node:sqlite': {
		[ReferenceTracker.ESM]: true,
		default: {
			DatabaseSync: {
				[ReferenceTracker.CONSTRUCT]: true,
			},
		},
		DatabaseSync: {
			[ReferenceTracker.CONSTRUCT]: true,
		},
	},
};

const databaseSyncCjsTraceMap = {
	'node:sqlite': {
		DatabaseSync: {
			[ReferenceTracker.CONSTRUCT]: true,
		},
	},
};

const unwrapExpression = node => {
	while (node && transparentExpressionTypes.has(node.type)) {
		node = node.expression;
	}

	return node;
};

const getVariableDefinition = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	return variable.defs[0];
};

const getVariableInitializer = (node, context) => {
	const definition = getVariableDefinition(node, context);
	if (
		definition?.type !== 'Variable'
		|| definition.node.type !== 'VariableDeclarator'
		|| definition.node.id.type !== 'Identifier'
	) {
		return;
	}

	const initializer = getConstVariableInitializer(node, context);
	if (!initializer) {
		return;
	}

	return {
		variable: findVariable(context.sourceCode.getScope(node), node),
		initializer,
	};
};

const getImportSpecifierName = node => node.imported.type === 'Identifier' ? node.imported.name : node.imported.value;

const isDatabaseSyncImport = (node, context) => {
	const definition = getVariableDefinition(node, context);
	if (
		!definition
		|| definition.type !== 'ImportBinding'
		|| definition.parent.source.value !== 'node:sqlite'
		|| !isRuntimeImportSpecifier(definition.node)
	) {
		return false;
	}

	return definition.node.type === 'ImportSpecifier'
		&& getImportSpecifierName(definition.node) === 'DatabaseSync';
};

const isSqliteNamespaceImport = (node, context) => {
	const definition = getVariableDefinition(node, context);
	if (
		!definition
		|| definition.type !== 'ImportBinding'
		|| definition.parent.source.value !== 'node:sqlite'
		|| !isRuntimeImportSpecifier(definition.node)
	) {
		return false;
	}

	return definition.node.type === 'ImportNamespaceSpecifier'
		|| definition.node.type === 'ImportDefaultSpecifier'
		|| (
			definition.node.type === 'ImportSpecifier'
			&& getImportSpecifierName(definition.node) === 'default'
		);
};

const isConstRequireBinding = (node, context) => {
	const definition = getVariableDefinition(node, context);
	return Boolean(
		definition
		&& definition.type === 'Variable'
		&& definition.node.type === 'VariableDeclarator'
		&& definition.parent.type === 'VariableDeclaration'
		&& definition.parent.kind === 'const'
		&& isStaticRequire(definition.node.init),
	);
};

const isDatabaseSyncRequireBinding = (node, context) => {
	if (!isConstRequireBinding(node, context)) {
		return false;
	}

	const definition = getVariableDefinition(node, context);
	const variable = findVariable(context.sourceCode.getScope(node), node);
	const {id} = definition.node;
	return id.type === 'ObjectPattern'
		&& id.properties.some(property =>
			property.type === 'Property'
			&& getPropertyName(property) === 'DatabaseSync'
			&& property.value.type === 'Identifier'
			&& findVariable(context.sourceCode.getScope(property.value), property.value) === variable,
		);
};

const isSqliteNamespaceRequireBinding = (node, context) => {
	if (!isConstRequireBinding(node, context)) {
		return false;
	}

	return getVariableDefinition(node, context).node.id.type === 'Identifier';
};

const isDatabaseSyncConstructor = (node, context, seenVariables = new Set()) => {
	const callee = unwrapExpression(node);
	if (callee.type === 'Identifier') {
		if (isDatabaseSyncImport(callee, context) || isDatabaseSyncRequireBinding(callee, context)) {
			return true;
		}

		const variableInfo = getVariableInitializer(callee, context);
		if (!variableInfo || seenVariables.has(variableInfo.variable)) {
			return false;
		}

		seenVariables.add(variableInfo.variable);
		return isDatabaseSyncConstructor(variableInfo.initializer, context, seenVariables);
	}

	if (callee.type !== 'MemberExpression' || getPropertyName(callee, context.sourceCode.getScope(callee)) !== 'DatabaseSync') {
		return false;
	}

	const object = unwrapExpression(callee.object);
	return isSqliteNamespaceImport(object, context)
		|| isSqliteNamespaceRequireBinding(object, context)
		|| isStaticRequire(object);
};

const getDatabaseConstructors = (program, context) => {
	const tracker = new ReferenceTracker(context.sourceCode.getScope(program));
	const databaseConstructors = new WeakSet();

	for (const reference of tracker.iterateEsmReferences(databaseSyncEsmTraceMap)) {
		if (
			reference.type === ReferenceTracker.CONSTRUCT
			&& isDatabaseSyncConstructor(reference.node.callee, context)
		) {
			databaseConstructors.add(reference.node);
		}
	}

	for (const reference of tracker.iterateCjsReferences(databaseSyncCjsTraceMap)) {
		if (
			reference.type === ReferenceTracker.CONSTRUCT
			&& isDatabaseSyncConstructor(reference.node.callee, context)
		) {
			databaseConstructors.add(reference.node);
		}
	}

	return databaseConstructors;
};

const createDatabaseInstanceChecker = (databaseConstructors, context) => {
	const cache = new WeakMap();

	const isDatabaseInstance = (node, seenVariables = new Set()) => {
		node = unwrapExpression(node);
		if (!node) {
			return false;
		}

		if (node.type === 'NewExpression') {
			return databaseConstructors.has(node);
		}

		if (node.type !== 'Identifier') {
			return false;
		}

		const variableInfo = getVariableInitializer(node, context);
		if (!variableInfo) {
			return false;
		}

		const {variable, initializer} = variableInfo;
		if (cache.has(variable)) {
			return cache.get(variable);
		}

		if (seenVariables.has(variable)) {
			return false;
		}

		seenVariables.add(variable);
		const result = isDatabaseInstance(initializer, seenVariables);
		cache.set(variable, result);

		return result;
	};

	return isDatabaseInstance;
};

const createUnsafeSqlArgumentChecker = context => {
	const cache = new WeakMap();

	const isUnsafeSqlArgument = (node, seenVariables = new Set()) => {
		node = unwrapExpression(node);
		if (!node) {
			return false;
		}

		if (node.type === 'TemplateLiteral') {
			return node.expressions.length > 0;
		}

		if (node.type === 'TaggedTemplateExpression') {
			return true;
		}

		if (node.type !== 'Identifier') {
			return false;
		}

		const variableInfo = getVariableInitializer(node, context);
		if (!variableInfo) {
			return false;
		}

		const {variable, initializer} = variableInfo;
		if (cache.has(variable)) {
			return cache.get(variable);
		}

		if (seenVariables.has(variable)) {
			return false;
		}

		seenVariables.add(variable);
		const result = isUnsafeSqlArgument(initializer, seenVariables);
		cache.set(variable, result);

		return result;
	};

	return isUnsafeSqlArgument;
};

const getProblem = (callExpression, context, isDatabaseInstance, isUnsafeSqlArgument) => {
	const callee = unwrapExpression(callExpression.callee);
	if (callee?.type !== 'MemberExpression') {
		return;
	}

	const method = getPropertyName(callee, context.sourceCode.getScope(callee));
	if (!databaseMethods.has(method) || !isDatabaseInstance(callee.object)) {
		return;
	}

	const [sql] = callExpression.arguments;
	if (!isUnsafeSqlArgument(sql, new Set())) {
		return;
	}

	return {
		node: sql,
		messageId: MESSAGE_ID,
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const callExpressions = [];

	context.on('CallExpression', node => {
		callExpressions.push(node);
	});

	context.onExit('Program', function * (program) {
		const databaseConstructors = getDatabaseConstructors(program, context);
		const isDatabaseInstance = createDatabaseInstanceChecker(databaseConstructors, context);
		const isUnsafeSqlArgument = createUnsafeSqlArgumentChecker(context);

		for (const callExpression of callExpressions) {
			const problem = getProblem(callExpression, context, isDatabaseInstance, isUnsafeSqlArgument);
			if (problem) {
				yield problem;
			}
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow interpolation into SQL strings passed to Node’s `node:sqlite` APIs.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
