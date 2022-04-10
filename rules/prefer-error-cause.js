'use strict';
const esquery = require('esquery');
const {isCommaToken} = require('eslint-utils');
const {matches, methodCallSelector} = require('./selectors/index.js');
const {appendArgument, replaceReferenceIdentifier} = require('./fix/index.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';

const messages = {
	[ERROR]: 'Prefer to add the old error as new error\'s `cause` property.',
	[SUGGESTION]: 'Add the old error as new error\'s `cause` property.',
};

const tryCatchSelector = matches([
	[
		'CatchClause',
		':has(ThrowStatement)',
	].join(''),
]);

const promiseCatchSelector = matches([
	[
		methodCallSelector({method: 'catch', argumentsLength: 1}),
		':has(ThrowStatement)',
	].join(''),
]);

const peek = array => {
	if (!array || array.length === 0) {
		return undefined;
	}

	return array[array.length - 1];
};

const insertProperty = (fixer, node, text, sourceCode) => {
	const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
	if (node.properties.length > 0) {
		text = isCommaToken(penultimateToken) ? `${text}` : `, ${text}`;
	}

	return fixer.insertTextBefore(lastToken, text);
};

const generateCauseInspector = inspectProperty => objectExpression => {
	if (!objectExpression || objectExpression.type !== 'ObjectExpression') {
		return false;
	}

	return objectExpression.properties.some(prop =>
		prop.key.name === 'cause' && inspectProperty(prop),
	);
};

const reportCannotBeFixed = (node, context) => {
	context.report({
		node,
		messageId: ERROR,
	});
};

const fixerUtils = {
	insertCauseArgument({fixer, node, sourceCode, value}) {
		return appendArgument(
			fixer,
			node,
			`{ cause: ${value} }`,
			sourceCode,
		);
	},

	insertCauseProperty({fixer, node, sourceCode, value}) {
		return insertProperty(fixer, node, `cause: ${value}`, sourceCode);
	},

	renameObjectProperty({fixer, node, key, value}) {
		if (!node || node.type !== 'ObjectExpression') {
			return false;
		}

		const identifier = node.properties.find(property => {
			if (property.key.name === key) {
				return property;
			}

			return undefined;
		});

		if (!identifier) {
			throw new Error(`objectExpression doesn't have ${key} property`);
		}

		return replaceReferenceIdentifier(identifier.value, value, fixer);
	},
};

const fix = ({
	fixer,
	node,
	sourceCode,
	statementToFix,
	errorArgumentIdentifier,
	errorConstructorLastArgument,
	isCauseNameValid,
}) => {
	if (!errorArgumentIdentifier) {
		errorArgumentIdentifier = 'error';

		// In case of Promise#catch
		if (node.type === 'CallExpression') {
			const functionExpression = node.arguments[0];

			let target;
			if (functionExpression.type === 'FunctionExpression') {
				target = sourceCode.getTokenBefore(functionExpression.body);
			} else if (functionExpression.type === 'ArrowFunctionExpression') {
				target = sourceCode.getTokenBefore(sourceCode.getTokenBefore(functionExpression.body));
			}

			return fixer.insertTextBefore(target, errorArgumentIdentifier);
		}

		// In case of try-catch statement
		return fixer.insertTextBefore(node.body, `(${errorArgumentIdentifier}) `);
	}

	if (errorConstructorLastArgument.type === 'ObjectExpression') {
		if (isCauseNameValid) {
			return fixerUtils.renameObjectProperty({
				fixer,
				node: errorConstructorLastArgument,
				key: 'cause',
				value: errorArgumentIdentifier,
			});
		}

		return fixerUtils.insertCauseProperty({
			fixer,
			node: errorConstructorLastArgument,
			sourceCode,
			value: errorArgumentIdentifier,
		});
	}

	const targetToInsertArgument = statementToFix.type === 'VariableDeclarator' ? statementToFix.init : statementToFix.argument;

	return fixerUtils.insertCauseArgument({
		fixer,
		node: targetToInsertArgument,
		sourceCode,
		value: errorArgumentIdentifier,
	});
};

const handleCatchBlock = ({node, statements, parameter, context}) => {
	if (parameter && parameter.type !== 'Identifier') {
		context.report({
			node,
			messageId: ERROR,
		});
		return;
	}

	const errorArgumentIdentifier = parameter?.name;

	const sourceCode = context.getSourceCode();

	const hasValidCauseProperty = generateCauseInspector(property => property.value.name === errorArgumentIdentifier);
	const hasInvalidCauseProperty = generateCauseInspector(property => property.value.name !== errorArgumentIdentifier);

	const throwStatement = statements.find(statement => statement.type === 'ThrowStatement');

	if (!throwStatement) {
		return;
	}

	const throwStatementArguments = throwStatement.argument;

	if (errorArgumentIdentifier && errorArgumentIdentifier === throwStatementArguments.name) {
		return;
	}

	let statementToFix;
	// Assume if 'cause' property is given, it is given through last argument.
	let errorConstructorLastArgument;

	if (throwStatementArguments.type === 'NewExpression') {
		statementToFix = throwStatement;
		errorConstructorLastArgument = peek(throwStatementArguments.arguments);

		// Maybe cannot be fixed because Error constructor's parenthesis (NewExpression) might be here or not.
		if (throwStatementArguments.arguments && throwStatementArguments.arguments.length === 0) {
			reportCannotBeFixed(node, context);
			return;
		}
	} else {
		const selector = esquery.parse([
			'VariableDeclarator',
			`[id.name="${throwStatement.argument.name}"]`,
			'[init.type="NewExpression"]',
		].join(''));

		const thrownErrorDeclarators = esquery.match(node, selector);

		if (thrownErrorDeclarators.length === 0) {
			reportCannotBeFixed(node, context);
			return;
		}

		const thrownErrorDeclarator = thrownErrorDeclarators[0];
		statementToFix = thrownErrorDeclarator;
		errorConstructorLastArgument = peek(thrownErrorDeclarator.init.arguments);

		if (
			thrownErrorDeclarators.length !== 1
			|| thrownErrorDeclarator.init.arguments.length === 0
		) {
			reportCannotBeFixed(node, context);
			return;
		}
	}

	if (hasValidCauseProperty(errorConstructorLastArgument)) {
		return;
	}

	context.report({
		node,
		messageId: ERROR,
		* fix(fixer) {
			yield fix({
				fixer,
				statementToFix,
				errorArgumentIdentifier,
				errorConstructorLastArgument,
				isCauseNameValid: hasInvalidCauseProperty(errorConstructorLastArgument),
				sourceCode,
				node,
			});
		},
	});
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[tryCatchSelector](node) {
		const catchBlock = node.body.body;

		handleCatchBlock({
			node,
			context,
			parameter: node.param,
			statements: catchBlock,
		});
	},
	[promiseCatchSelector](node) {
		const functionExpression = node.arguments[0];
		const functionInnerBlockStatements = functionExpression.body?.body;
		if (!functionInnerBlockStatements) {
			return;
		}

		const errorParameter = functionExpression.params[0];

		handleCatchBlock({
			node,
			context,
			parameter: errorParameter,
			statements: functionInnerBlockStatements,
		});
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer to add the old error as new error\'s `cause` property.',
		},
		fixable: 'code',
		messages,
	},
};
