'use strict';
const {isCommaToken} = require('eslint-utils');
const _ = require('lodash');
const {matches, methodCallSelector} = require('./selectors/index.js');
const {appendArgument, replaceReferenceIdentifier} = require('./fix/index.js');
const getReferences = require('./utils/get-references.js');

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

const promiseThenCatchSelector = matches([
	[
		matches([
			methodCallSelector({method: 'then', argumentsLength: 2}),
			methodCallSelector({method: 'catch', argumentsLength: 1}),
		]),
		':has(ThrowStatement)',
	].join(''),
]);

const peekTop = array => array[array.length - 1];

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
		!property.computed && property.key.name === 'cause' && inspectProperty(property),
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
	context,
	statementToFix,
	errorArgumentIdentifier,
	errorConstructorLastArgument,
	isCauseNameValid,
}) => {
	const sourceCode = context.getSourceCode();

	if (!errorArgumentIdentifier) {
		const allReferences = getReferences(context.getScope());

		// Cannot be fixed
		if (allReferences.some(reference => reference?.identifier.name === 'error')) {
			return;
		}

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

	let nodeToInsertArgument;

	switch (statementToFix.type) {
		case 'VariableDeclarator': {
			nodeToInsertArgument = statementToFix.init;
			break;
		}

		case 'AssignmentExpression': {
			nodeToInsertArgument = statementToFix.right;
			break;
		}

		case 'ThrowStatement': {
			nodeToInsertArgument = statementToFix.argument;
			break;
		}

		default: {
			throw new Error('statementToFix is not invalid type');
		}
	}

	return fixerUtils.insertCauseArgument({
		fixer,
		node: nodeToInsertArgument,
		sourceCode,
		value: errorArgumentIdentifier,
	});
};

const getAllNodesToFix = ({node, context, throwStatement}) => {
	const result = [];

	let statementToFix;
	let errorConstructorLastArgument;

	// `try {} catch (err) { throw new Error('oops', {cause: err})}`
	// `promise.catch(err => { throw new Error('oops', {cause: err})`
	if (throwStatement.argument.type === 'NewExpression') {
		errorConstructorLastArgument = peekTop(throwStatement.argument.arguments);

		if (!errorConstructorLastArgument) {
			reportCannotBeFixed(node, context);
			return;
		}

		result.push({
			node: errorConstructorLastArgument,
			statementToFix: throwStatement,
		});
	} else {
		// Assume Error's constructor exists in other node of the block
		// It could be VariableDeclarator or AssignmentExpression.

		const newExpressionSelector = reference =>
			(reference.identifier?.parent.type === 'AssignmentExpression'
			|| reference.identifier?.parent.type === 'VariableDeclarator')
			&& reference.writeExpr?.type === 'NewExpression'
			&& reference.resolved?.name === throwStatement.argument.name;

		const thrownErrorDeclarators = getReferences(context.getScope())
			.filter(reference => newExpressionSelector(reference))
			.map(reference => reference.identifier.parent);

		// Report newExpression not found in given block.
		// `try {} catch { const err = new Error; try {} catch { throw err; } }`
		if (_.isEmpty(thrownErrorDeclarators)) {
			reportCannotBeFixed(node, context);
			return;
		}

		// `try {} catch (err) { let e1 = new Error('oops'); e1 = new Error('oops'); throw error;}`

		for (const thrownErrorDeclarator of thrownErrorDeclarators) {
			statementToFix = thrownErrorDeclarator;

			let targetArguments;
			if (thrownErrorDeclarator.type === 'VariableDeclarator') {
				targetArguments = thrownErrorDeclarator.init.arguments;
			} else if (thrownErrorDeclarator.type === 'AssignmentExpression') {
				targetArguments = thrownErrorDeclarator.right.arguments;
			}

			errorConstructorLastArgument = peekTop(targetArguments);

			if (!errorConstructorLastArgument) {
				reportCannotBeFixed(node, context);
				return;
			}

			result.push({
				node: errorConstructorLastArgument,
				statementToFix,
			});
		}
	}

	return result;
};

const handleCatchBlock = ({node, context, statements, parameter}) => {
	const throwStatement = statements.find(statement => statement.type === 'ThrowStatement');

	// Filter blocks not having throw statement.
	// `try {} catch (error) {}`
	// `promise.catch(error => {})`
	if (!throwStatement) {
		return;
	}

	const errorArgumentIdentifier = parameter?.name;
	const throwStatementArgument = throwStatement.argument;

	// Filter block having valid cause property
	// `try {} catch (err) { throw new Error('oops', {cause: err})}`
	// `promise.catch(err => { throw new Error('oops', {cause: err})`
	if (errorArgumentIdentifier && errorArgumentIdentifier === throwStatementArgument.name) {
		return;
	}

	// Report none identifier parameter
	// `try {} catch ({error}) {}`
	// `promise.catch({error} => {})`
	if (parameter && parameter.type !== 'Identifier') {
		context.report({
			node,
			messageId: ERROR,
		});
		return;
	}

	const hasValidCauseProperty = generateCauseInspector(property => property.value.name === errorArgumentIdentifier);
	const hasInvalidCauseProperty = generateCauseInspector(property => property.value.name !== errorArgumentIdentifier);

	const nodesToFixCandidates = getAllNodesToFix({node, context, throwStatement});
	if (_.isEmpty(nodesToFixCandidates)) {
		return;
	}

	const nodesToFix = nodesToFixCandidates.filter(({node}) =>
		!hasValidCauseProperty(node),
	);

	for (const nodeToFix of nodesToFix) {
		// Prevent repetitive fixing
		if (hasValidCauseProperty(nodeToFix.node)) {
			continue;
		}

		context.report({
			node,
			messageId: ERROR,
			fix(fixer) {
				return fix({
					fixer,
					node,
					context,
					statementToFix: nodeToFix.statementToFix,
					errorConstructorLastArgument: nodeToFix.node,
					errorArgumentIdentifier,
					isCauseNameValid: hasInvalidCauseProperty(nodeToFix.node),
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
	[promiseThenCatchSelector](node) {
		const functionExpression = node.callee.property.name === 'then' ? node.arguments[1] : node.arguments[0];
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
