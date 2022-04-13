/* eslint-disable capitalized-comments */
/* eslint-disable brace-style */
'use strict';
const esquery = require('esquery');
const {isCommaToken} = require('eslint-utils');
const _ = require('lodash');
const {matches, methodCallSelector} = require('./selectors/index.js');
const {appendArgument, replaceReferenceIdentifier} = require('./fix/index.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';

const messages = {
	[ERROR]: 'Prefer specifying an old error as `cause` option where rethrowing the error.',
	[SUGGESTION]: 'Specify `cause` option to Error\'s constructor.',
};

const catchClauseSelector = matches([
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

const peekTop = array => {
	if (_.isEmpty(array)) {
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

	return objectExpression.properties.some(property =>
		property.key.name === 'cause' && inspectProperty(property),
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
			`{cause: ${value}}`,
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

	handleEmptyArgument({fixer, node, sourceCode, errorArgumentIdentifier}) {
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
		return fixerUtils.handleEmptyArgument({fixer, node, sourceCode, errorArgumentIdentifier});
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

	let targetToInsertArgument;

	if (statementToFix.type === 'VariableDeclarator') {
		targetToInsertArgument = statementToFix.init;
	} else if (statementToFix.type === 'AssignmentExpression') {
		targetToInsertArgument = statementToFix.right;
	} else {
		targetToInsertArgument = statementToFix.argument;
	}

	return fixerUtils.insertCauseArgument({
		fixer,
		node: targetToInsertArgument,
		sourceCode,
		value: errorArgumentIdentifier,
	});
};

const getStatementToFix = ({node, context, throwStatement}) => {
	let statementToFix;
	let errorConstructorLastArgument;

	// try {} catch (err) { throw new Error('oops', {cause: err})}
	// promise.catch(err => { throw new Error('oops', {cause: err})
	if (throwStatement.argument.type === 'NewExpression') {
		const newExpression = throwStatement.argument;

		statementToFix = throwStatement;
		// Assume if 'cause' property is given, it should be given through last argument.
		errorConstructorLastArgument = peekTop(newExpression.arguments);
	}
	// Assume Error's constructor exists in other node of the block
	// It could be VariableDeclarator or
	else {
		const newExpressionSelector = esquery.parse(matches([
			// try {} catch (err) { const error = new Error('oops', {cause: err}); throw error;}
			// promise.catch(err => { const error = new Error('oops', {cause: err}); throw error; })
			[
				'VariableDeclarator',
				`[id.name="${throwStatement.argument.name}"]`,
				'[init.type="NewExpression"]',
			].join(''),
			// try {} catch (err) { let err; err = new Error(); throw err; }
			// promise.catch(err => { let err; err = new Error(); throw err; })
			[
				'AssignmentExpression',
				`[left.name="${throwStatement.argument.name}"]`,
				'[right.type="NewExpression"]',
			].join(''),
		]));

		const thrownErrorDeclarators = esquery.match(node, newExpressionSelector);

		// Report in case declarator not found in given block.
		// try {} catch { const err = new Error; try {} catch { throw err; } }
		if (_.isEmpty(thrownErrorDeclarators)) {
			reportCannotBeFixed(node, context);
			return;
		}

		// try {} catch (err) { let e1 = new Error('oops'); e1 = new Error('oops'); throw error;}
		const thrownErrorDeclarator = thrownErrorDeclarators[0];

		statementToFix = thrownErrorDeclarator;
		// Assume if 'cause' property is given, it should be given through last argument.

		let targetArguments;
		if (thrownErrorDeclarator.type === 'VariableDeclarator') {
			targetArguments = thrownErrorDeclarator.init.arguments;
		} else if (thrownErrorDeclarator.type === 'AssignmentExpression') {
			targetArguments = thrownErrorDeclarator.right.arguments;
		}

		errorConstructorLastArgument = peekTop(targetArguments);
	}

	// Maybe cannot be fixed since Error constructor's parenthesis (NewExpression) might be here or not.
	if (!errorConstructorLastArgument) {
		reportCannotBeFixed(node, context);
		return;
	}

	return {
		statementToFix,
		errorConstructorLastArgument,
	};
};

const handleCatchBlock = ({node, context, statements, parameter}) => {
	const throwStatement = statements.find(statement => statement.type === 'ThrowStatement');

	// Filter blocks not having throw statement.
	// try {} catch (error) {}
	// promise.catch(error => {})
	if (!throwStatement) {
		return;
	}

	const errorArgumentIdentifier = parameter?.name;
	const sourceCode = context.getSourceCode();

	const throwStatementArguments = throwStatement.argument;

	// Filter block having valid cause property
	// try {} catch (err) { throw new Error('oops', {cause: err})}
	// promise.catch(err => { throw new Error('oops', {cause: err})
	if (errorArgumentIdentifier && errorArgumentIdentifier === throwStatementArguments.name) {
		return;
	}

	// Report none identifier parameter
	// try {} catch ({error}) {}
	// promise.catch({error} => {})
	if (parameter && parameter.type !== 'Identifier') {
		context.report({
			node,
			messageId: ERROR,
		});
		return;
	}

	const result = getStatementToFix({node, context, throwStatement});
	if (!result) {
		return;
	}

	const {statementToFix, errorConstructorLastArgument} = result;

	const hasValidCauseProperty = generateCauseInspector(property => property.value.name === errorArgumentIdentifier);
	const hasInvalidCauseProperty = generateCauseInspector(property => property.value.name !== errorArgumentIdentifier);

	// Prevent repetitive fixing
	if (!hasValidCauseProperty(errorConstructorLastArgument)) {
		context.report({
			node,
			messageId: ERROR,
			* fix(fixer) {
				yield fix({
					fixer,
					node,
					sourceCode,
					statementToFix,
					errorArgumentIdentifier,
					errorConstructorLastArgument,
					isCauseNameValid: hasInvalidCauseProperty(errorConstructorLastArgument),
				});
			},
		});
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[catchClauseSelector](node) {
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
			description: 'Prefer specifying an old error as `cause` option where rethrowing the error.',
		},
		fixable: 'code',
		messages,
	},
};
