import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isStaticRequire} from './ast/index.js';
import {isGlobalIdentifier, isRuntimeImportSpecifier, isTypeScriptExpressionWrapper} from './utils/index.js';

const MESSAGE_ID = 'no-unsafe-sqlite-interpolation';
const messages = {
	[MESSAGE_ID]: 'Do not interpolate values into `node:sqlite` SQL strings.',
};

const databaseMethods = new Set([
	'exec',
	'prepare',
]);

const unwrapExpression = node => {
	while (node && (node.type === 'ChainExpression' || node.type === 'TSInstantiationExpression' || isTypeScriptExpressionWrapper(node))) {
		node = node.expression;
	}

	return node;
};

const getVariableInfo = (node, context) => {
	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	return {
		variable,
		definition: variable.defs[0],
	};
};

const getConstVariableInfo = (node, context) => {
	const variableInfo = getVariableInfo(node, context);
	const definition = variableInfo?.definition;
	if (
		!variableInfo
		|| definition.type !== 'Variable'
		|| definition.node.type !== 'VariableDeclarator'
		|| definition.parent.type !== 'VariableDeclaration'
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	return {
		...variableInfo,
		initializer: definition.node.init,
	};
};

const getSimpleConstVariableInfo = (node, context) => {
	const variableInfo = getConstVariableInfo(node, context);
	return variableInfo?.definition.node.id.type === 'Identifier' ? variableInfo : undefined;
};

const getImportSpecifierName = node => node.imported.type === 'Identifier' ? node.imported.name : node.imported.value;

const getNodeSqliteImportSpecifier = (node, context) => {
	const definition = getVariableInfo(node, context)?.definition;
	if (
		!definition
		|| definition.type !== 'ImportBinding'
		|| definition.parent.source.value !== 'node:sqlite'
		|| !isRuntimeImportSpecifier(definition.node)
	) {
		return;
	}

	return definition.node;
};

const isDatabaseSyncImport = (node, context) => {
	const specifier = getNodeSqliteImportSpecifier(node, context);
	return specifier?.type === 'ImportSpecifier'
		&& getImportSpecifierName(specifier) === 'DatabaseSync';
};

const isSqliteNamespaceImport = (node, context) => {
	const specifier = getNodeSqliteImportSpecifier(node, context);

	return specifier?.type === 'ImportNamespaceSpecifier'
		|| specifier?.type === 'ImportDefaultSpecifier'
		|| (
			specifier?.type === 'ImportSpecifier'
			&& getImportSpecifierName(specifier) === 'default'
		);
};

const isNodeSqliteRequire = (node, context) => {
	const requireCall = unwrapExpression(node);
	return isStaticRequire(requireCall)
		&& isGlobalIdentifier(requireCall.callee, context)
		&& requireCall.arguments[0].value === 'node:sqlite';
};

const getNodeSqliteRequireBinding = (node, context) => {
	const variableInfo = getConstVariableInfo(node, context);
	if (!variableInfo || !isNodeSqliteRequire(variableInfo.initializer, context)) {
		return;
	}

	return variableInfo;
};

const isDatabaseSyncRequireBinding = (node, context) => {
	const variableInfo = getNodeSqliteRequireBinding(node, context);
	if (!variableInfo) {
		return false;
	}

	const {definition, variable} = variableInfo;
	const {id} = definition.node;
	return id.type === 'ObjectPattern'
		&& id.properties.some(property =>
			property.type === 'Property'
			&& getPropertyName(property) === 'DatabaseSync'
			&& property.value.type === 'Identifier'
			&& findVariable(context.sourceCode.getScope(property.value), property.value) === variable,
		);
};

const isSqliteNamespaceRequireBinding = (node, context) => getNodeSqliteRequireBinding(node, context)?.definition.node.id.type === 'Identifier';

const isDatabaseSyncConstructor = (node, context, seenVariables = new Set()) => {
	const callee = unwrapExpression(node);
	if (!callee) {
		return false;
	}

	if (callee.type === 'Identifier') {
		if (isDatabaseSyncImport(callee, context) || isDatabaseSyncRequireBinding(callee, context)) {
			return true;
		}

		const variableInfo = getSimpleConstVariableInfo(callee, context);
		if (!variableInfo || seenVariables.has(variableInfo.variable)) {
			return false;
		}

		seenVariables.add(variableInfo.variable);
		return isDatabaseSyncConstructor(variableInfo.initializer, context, seenVariables);
	}

	if (callee.type !== 'MemberExpression' || getPropertyName(callee, context.sourceCode.getScope(callee)) !== 'DatabaseSync') {
		return false;
	}

	return isSqliteNamespace(callee.object, context);
};

const isSqliteNamespace = (node, context, seenVariables = new Set()) => {
	node = unwrapExpression(node);
	if (isNodeSqliteRequire(node, context)) {
		return true;
	}

	if (node?.type !== 'Identifier') {
		return false;
	}

	if (isSqliteNamespaceImport(node, context) || isSqliteNamespaceRequireBinding(node, context)) {
		return true;
	}

	const variableInfo = getSimpleConstVariableInfo(node, context);
	if (!variableInfo || seenVariables.has(variableInfo.variable)) {
		return false;
	}

	seenVariables.add(variableInfo.variable);
	return isSqliteNamespace(variableInfo.initializer, context, seenVariables);
};

const getDatabaseConstructors = (newExpressions, context) => {
	const databaseConstructors = new WeakSet();

	for (const newExpression of newExpressions) {
		if (isDatabaseSyncConstructor(newExpression.callee, context)) {
			databaseConstructors.add(newExpression);
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

		const variableInfo = getSimpleConstVariableInfo(node, context);
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

		const variableInfo = getSimpleConstVariableInfo(node, context);
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
	const newExpressions = [];

	context.on('CallExpression', node => {
		callExpressions.push(node);
	});

	context.on('NewExpression', node => {
		newExpressions.push(node);
	});

	context.onExit('Program', function * () {
		const databaseConstructors = getDatabaseConstructors(newExpressions, context);
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
