'use strict';
const {isCommaToken} = require('eslint-utils');
const _ = require('lodash');
const {appendArgument} = require('./fix/index.js');
const getReferences = require('./utils/get-references.js');
const getMatchingAncestorOfType = require('./utils/get-matching-ancestor-of-type.js');

const ERROR = 'error';
const SUGGESTION = 'suggestion';

const messages = {
	[ERROR]: 'Prefer specifying an old error as `cause` option where rethrowing the error.',
	[SUGGESTION]: 'Specify `cause` option to Error\'s constructor.',
};

const throwStatementSelector = 'ThrowStatement';

const peekTop = array => array[array.length - 1];

const hasCauseProperty = objectExpression => {
	if (!objectExpression || objectExpression.type !== 'ObjectExpression') {
		return false;
	}

	return objectExpression.properties.some(property =>
		!property.computed && property.key.name === 'cause',
	);
};

const reportCannotBeFixed = (node, context) => {
	context.report({
		node,
		messageId: ERROR,
	});
};

const fixerUtils = {
	insertProperty(fixer, node, text, sourceCode) {
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(node, 2);
		if (node.properties.length > 0) {
			text = isCommaToken(penultimateToken) ? `${text}` : `, ${text}`;
		}

		return fixer.insertTextBefore(lastToken, text);
	},

	insertErrorCatchClauseParameter({fixer, catchBlock, errorArgumentIdentifier}) {
		return fixer.insertTextBefore(catchBlock.body, `(${errorArgumentIdentifier}) `);
	},

	insertFunctionParameter({fixer, catchBlock, sourceCode, errorArgumentIdentifier}) {
		const functionExpression = catchBlock.arguments[0];

		let target;
		if (functionExpression.type === 'FunctionExpression') {
			target = sourceCode.getTokenBefore(functionExpression.body);
		} else if (functionExpression.type === 'ArrowFunctionExpression') {
			target = sourceCode.getTokenBefore(sourceCode.getTokenBefore(functionExpression.body));
		}

		return fixer.insertTextBefore(target, errorArgumentIdentifier);
	},
};

const fix = ({
	fixer,
	catchBlock,
	context,
	statementToFix,
	errorArgumentIdentifier,
	errorConstructorLastArgument,
}) => {
	const sourceCode = context.getSourceCode();

	if (!errorArgumentIdentifier) {
		const allReferences = getReferences(context.getScope());

		// Cannot be fixed
		if (allReferences.some(reference => reference?.identifier.name === 'error')) {
			return;
		}

		errorArgumentIdentifier = 'error';

		// In case of Promise#catch
		if (catchBlock.type === 'CallExpression') {
			return fixerUtils.insertFunctionParameter({fixer, catchBlock, sourceCode, errorArgumentIdentifier});
		}

		return fixerUtils.insertErrorCatchClauseParameter({fixer, catchBlock, errorArgumentIdentifier});
	}

	if (errorConstructorLastArgument.type === 'ObjectExpression') {
		return fixerUtils.insertProperty(
			fixer,
			errorConstructorLastArgument,
			`cause: ${errorArgumentIdentifier}`,
			sourceCode,
		);
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

	return appendArgument(
		fixer,
		nodeToInsertArgument,
		`{cause: ${errorArgumentIdentifier}}`,
		sourceCode,
	);
};

const getAllNodesToFix = ({catchBlock, context, throwStatement}) => {
	const result = [];

	let statementToFix;
	let errorConstructorLastArgument;

	// `try {} catch (err) { throw new Error('oops', {cause: err})}`
	// `promise.then(undefined, err => { throw new Error('oops', {cause: err})`
	// `promise.catch(err => { throw new Error('oops', {cause: err})`
	if (throwStatement.argument.type === 'NewExpression') {
		errorConstructorLastArgument = peekTop(throwStatement.argument.arguments);

		if (!errorConstructorLastArgument) {
			reportCannotBeFixed(catchBlock, context);
			return [];
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
			reportCannotBeFixed(catchBlock, context);
			return [];
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
				reportCannotBeFixed(catchBlock, context);
				return [];
			}

			result.push({
				node: errorConstructorLastArgument,
				statementToFix,
			});
		}
	}

	return result;
};

const handleCatchBlock = ({context, catchBlock, parameter, throwStatement}) => {
	const errorArgumentIdentifier = parameter?.name;
	const throwStatementArgument = throwStatement.argument;

	// Filter rethrowing the error itself.
	// `try {} catch (err) { throw err; }`
	// `promise.then(undefined, (err) => { throw err; })`
	// `promise.catch(err => { throw err; })`
	if (errorArgumentIdentifier && errorArgumentIdentifier === throwStatementArgument.name) {
		return;
	}

	// Report none identifier parameter
	// `try {} catch ({error}) {}`
	// `promise.then(undefined, ({error}) => {})`
	// `promise.catch({error} => {})`
	if (parameter && parameter.type !== 'Identifier') {
		context.report({
			node: catchBlock,
			messageId: ERROR,
		});
		return;
	}

	const nodesToFixCandidates = getAllNodesToFix({catchBlock, context, throwStatement});

	const nodesToFix = nodesToFixCandidates.filter(({node}) =>
		!hasCauseProperty(node),
	);

	for (const nodeToFix of nodesToFix) {
		context.report({
			node: catchBlock,
			messageId: ERROR,
			fix(fixer) {
				return fix({
					fixer,
					context,
					catchBlock,
					statementToFix: nodeToFix.statementToFix,
					errorConstructorLastArgument: nodeToFix.node,
					errorArgumentIdentifier,
				});
			},
		});
	}
};

const isThenMethod = callExpression =>
	callExpression?.optional !== true
	&& callExpression?.arguments?.length === 2
	&& callExpression?.arguments[0].type !== 'SpreadElement'
	&& callExpression?.arguments[1].type !== 'SpreadElement'
	&& callExpression?.callee.type === 'MemberExpression'
	&& callExpression?.callee.optional !== true
	&& callExpression?.callee.computed !== true
	&& callExpression?.callee.property.type === 'Identifier'
	&& callExpression?.callee.property.name === 'then';

const isCatchMethod = callExpression =>
	callExpression?.optional !== true
	&& callExpression?.arguments?.length === 1
	&& callExpression?.arguments[0].type !== 'SpreadElement'
	&& callExpression?.callee.type === 'MemberExpression'
	&& callExpression?.callee.optional !== true
	&& callExpression?.callee.computed !== true
	&& callExpression?.callee.property.type === 'Identifier'
	&& callExpression?.callee.property.name === 'catch';

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	[throwStatementSelector](node) {
		const catchBlock
			= getMatchingAncestorOfType(node, 'CatchClause')
			|| getMatchingAncestorOfType(node, 'CallExpression', parent => isThenMethod(parent) || isCatchMethod(parent));

		if (catchBlock.type === 'CatchClause') {
			handleCatchBlock({
				catchBlock,
				context,
				parameter: catchBlock.param,
				throwStatement: node,
			});
		} else {
			const functionExpression = catchBlock.callee.property.name === 'then' ? catchBlock.arguments[1] : catchBlock.arguments[0];
			const functionInnerBlockStatements = functionExpression.body?.body;
			if (!functionInnerBlockStatements) {
				return;
			}

			const errorParameter = functionExpression.params[0];

			handleCatchBlock({
				catchBlock,
				context,
				parameter: errorParameter,
				throwStatement: node,
			});
		}
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