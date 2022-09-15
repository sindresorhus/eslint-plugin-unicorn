'use strict';
const _ = require('lodash');
const esquery = require('esquery');
const {isCommaToken} = require('eslint-utils');
const {appendArgument} = require('./fix/index.js');
const {methodCallSelector} = require('./selectors/index.js');
const getReferences = require('./utils/get-references.js');
const getMatchingAncestorOfType = require('./utils/get-matching-ancestor-of-type.js');

const ERROR = 'error';

const messages = {
	[ERROR]: 'Prefer specifying an old error as `cause` option when rethrowing the error.',
};

const promiseThenSelector = methodCallSelector({method: 'then', argumentsLength: 2});
const promiseCatchSelector = methodCallSelector({method: 'catch', argumentsLength: 1});

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

const isFunctionType = type => type === 'FunctionExpression' || type === 'ArrowFunctionExpression' || type === 'FunctionDeclaration';

const isArgumentOfFunction = (identifier, {rootNode, functionType}) => {
	const selector = functionType === 'then' ? promiseThenSelector : promiseCatchSelector;
	const argumentOrder = functionType === 'then' ? 1 : 0;
	const selectedExpressions = esquery.match(rootNode, esquery.parse(selector));

	for (const expression of selectedExpressions) {
		if (
			expression.arguments[argumentOrder].type === 'Identifier'
			&& expression.arguments[argumentOrder].name === identifier
		) {
			return true;
		}

		if (
			isFunctionType(expression.arguments[argumentOrder].type)
			&& esquery.matches(expression.arguments[argumentOrder].body, esquery.parse(`[type="CallExpression"][callee.name="${identifier}"]`))
		) {
			return true;
		}
	}

	return false;
};

const getCatchBlock = node => {
	let current = node;

	while (current) {
		let outerScopeCallbackIdentifier;
		let shouldExcludeOuterScopeOldError = false;

		if (isFunctionType(current.type)) {
			if (current.parent.type === 'VariableDeclarator') {
				outerScopeCallbackIdentifier = current.parent.id.name;
			} else if (current.parent.type === 'AssignmentExpression') {
				outerScopeCallbackIdentifier = current.parent.left.name;
			} else if (!isThenMethod(current.parent) && !isCatchMethod(current.parent)) {
				shouldExcludeOuterScopeOldError = true;
			}
		}

		if (outerScopeCallbackIdentifier) {
			const rootNode = getMatchingAncestorOfType(node, 'Program');

			if (
				isArgumentOfFunction(outerScopeCallbackIdentifier, {functionType: 'then', rootNode})
				|| isArgumentOfFunction(outerScopeCallbackIdentifier, {functionType: 'catch', rootNode})
			) {
				return current.parent;
			}

			// If the parent scope is function type and the function is not argument of Promise#{then,catch},
			// The function is not the expression to fix.
			return;
		}

		if (shouldExcludeOuterScopeOldError) {
			return;
		}

		if (current.type === 'CatchClause' || (current.type === 'CallExpression' && (isThenMethod(current) || isCatchMethod(current)))) {
			return current;
		}

		current = current.parent;
	}
};

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

		// In case of Promise#{then,catch}
		if (catchBlock.type === 'CallExpression') {
			const functionExpression = catchBlock.callee.property.name === 'then' ? catchBlock.arguments[1] : catchBlock.arguments[0];

			let target;
			if (functionExpression.type === 'FunctionExpression') {
				target = sourceCode.getTokenBefore(functionExpression.body);
			} else if (functionExpression.type === 'ArrowFunctionExpression') {
				target = sourceCode.getTokenBefore(sourceCode.getTokenBefore(functionExpression.body));
			}

			return fixer.insertTextBefore(target, errorArgumentIdentifier);
		}

		return fixer.insertTextBefore(catchBlock.body, `(${errorArgumentIdentifier}) `);
	}

	if (errorConstructorLastArgument.type === 'ObjectExpression') {
		const [penultimateToken, lastToken] = sourceCode.getLastTokens(errorConstructorLastArgument, 2);

		let text = `cause: ${errorArgumentIdentifier}`;
		if (errorConstructorLastArgument.properties.length > 0 && !isCommaToken(penultimateToken)) {
			text = ', ' + text;
		}

		return fixer.insertTextBefore(lastToken, text);
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
			/* c8 ignore next */
			throw new Error('statementToFix is not valid type');
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
	// `promise.catch(err => { throw new Error('oops', {cause: err})`
	if (throwStatement.argument.type === 'NewExpression') {
		if (throwStatement.argument.callee.name !== 'Error') {
			reportCannotBeFixed(throwStatement.argument, context);
			return [];
		}

		errorConstructorLastArgument = throwStatement.argument.arguments[throwStatement.argument.arguments.length - 1];

		if (!errorConstructorLastArgument) {
			reportCannotBeFixed(throwStatement.argument, context);
			return [];
		}

		result.push({
			node: errorConstructorLastArgument,
			statementToFix: throwStatement,
		});
	} else {
		// Assume Error's constructor exists in other node's of the block
		// It could be VariableDeclarator or AssignmentExpression.
		const newExpressionSelector = reference =>
			(reference.identifier?.parent.type === 'AssignmentExpression'
			|| reference.identifier?.parent.type === 'VariableDeclarator')
			&& reference.writeExpr?.type === 'NewExpression'
			&& reference.writeExpr?.callee.name === 'Error'
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

			errorConstructorLastArgument = targetArguments[targetArguments.length - 1];

			if (!errorConstructorLastArgument) {
				reportCannotBeFixed(thrownErrorDeclarator, context);
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
	// `promise.catch(err => { throw err; })`
	if (errorArgumentIdentifier && errorArgumentIdentifier === throwStatementArgument.name) {
		return;
	}

	// Report none identifier parameter
	// `try {} catch ({error}) {}`
	// `promise.catch({error} => {})`
	if (parameter && parameter.type !== 'Identifier') {
		reportCannotBeFixed(catchBlock, context);
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	'ThrowStatement'(node) {
		const catchBlock = getCatchBlock(node);

		if (!catchBlock) {
			return;
		}

		switch (catchBlock.type) {
			case 'CatchClause': {
				handleCatchBlock({
					catchBlock,
					context,
					parameter: catchBlock.param,
					throwStatement: node,
				});
				break;
			}

			case 'CallExpression': {
				const functionExpression = catchBlock.callee.property.name === 'then' ? catchBlock.arguments[1] : catchBlock.arguments[0];

				handleCatchBlock({
					catchBlock,
					context,
					parameter: functionExpression.params[0],
					throwStatement: node,
				});
				break;
			}

			case 'VariableDeclarator': {
				handleCatchBlock({
					catchBlock,
					context,
					parameter: catchBlock.init.params[0],
					throwStatement: node,
				});
				break;
			}

			case 'AssignmentExpression': {
				handleCatchBlock({
					catchBlock,
					context,
					parameter: catchBlock.right.params[0],
					throwStatement: node,
				});
				break;
			}

			default: {
				/* c8 ignore next */
				throw new Error('catchBlock is not valid type');
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer specifying an old error as `cause` option when rethrowing the error.',
		},
		fixable: 'code',
		messages,
	},
};
