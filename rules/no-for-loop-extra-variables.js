'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

function checkForLoop(context, node) {
	if (checkMultipleDeclaredVariables(node.init) && checkIteratorType(node)) {
		context.report({
			node,
			message: 'Unnecessary variable in for-loop.',
			fix(fixer) {
				return fixForLoop(node, context, fixer);
			}
		});
	}
}

function checkMultipleDeclaredVariables(node) {
	return node.type === 'VariableDeclaration' && node.declarations.length > 1;
}

function checkIteratorType(node) {
	let iteratorNode;
	const {update} = node;
	if (update.type === 'AssignmentExpression') {
		iteratorNode = update.left;
	} else if (update.type === 'UpdateExpression') {
		iteratorNode = update.argument;
	} else {
		return false;
	}

	const variableNames = getVariableNames(node);
	return iteratorNode.type === 'Identifier' && variableNames.includes(iteratorNode.name);
}

function getVariableNames(node) {
	return node.init.declarations.map(declaration => declaration.id.name);
}

function getIteratorName(node) {
	return node.update.type === 'AssignmentExpression' ? node.update.left.name : node.update.argument.name;
}

function fixForLoop(node, context, fixer) {
	const sourceCode = context.getSourceCode();
	const nonIterator = getVariableNames(node).find(variableName => variableName !== getIteratorName(node));
	const nonIteratorDeclaration = node.init.declarations.find(declaration => declaration.id.name === nonIterator);
	const iteratorDeclaration = node.init.declarations.find(declaration => declaration.id.name !== nonIterator);

	function replaceInTestFix() {
		const nonIteratorInitValue = sourceCode.getText(nonIteratorDeclaration.init);
		const nonIteratorTokensInTest = getNonIteratorTokensInNode(sourceCode, node.test, nonIterator);
		return nonIteratorTokensInTest.map(token => {
			return fixer.replaceText(token, nonIteratorInitValue);
		});
	}

	function removeDeclarationFix() {
		return [fixer.replaceText(node.init, node.init.kind + ' ' + sourceCode.getText(iteratorDeclaration))];
	}

	function moveDeclarationFix() {
		return [...removeDeclarationFix(), fixer.insertTextBefore(node, node.init.kind + ' ' + sourceCode.getText(nonIteratorDeclaration) + '\n')];
	}

	function removeVariableFix() {
		return [...removeDeclarationFix(), ...replaceInTestFix()];
	}

	if (node.init.kind === 'let') {
		if (checkNonIteratorUsedInNode(node, context)) {
			if (checkNonIteratorUsedOutsideNode(node, context)) {
				return undefined;
			}

			return moveDeclarationFix();
		}

		return removeVariableFix();
	}

	if (checkNonIteratorUsedInNode(node, context) || checkNonIteratorUsedOutsideNode(node, context)) {
		return moveDeclarationFix();
	}

	return removeVariableFix();
}

function checkNonIteratorUsedInNode(node, context) {
	const nonIterator = getVariableNames(node).find(variableName => variableName !== getIteratorName(node));
	const sourceCode = context.getSourceCode();
	return getNonIteratorTokensInNode(sourceCode, node.body, nonIterator).length !== 0;
}

function getNonIteratorTokensInNode(sourceCode, node, nonIterator) {
	return sourceCode.getTokens(node).filter(token => {
		return token.type === 'Identifier' && token.value === nonIterator;
	});
}

function checkNonIteratorUsedOutsideNode(node, context) {
	const nonIterator = getVariableNames(node).find(variableName => variableName !== getIteratorName(node));
	const sourceCode = context.getSourceCode();
	return getNonIteratorTokenOutsideNode(sourceCode, node, nonIterator).length !== 0;
}

function getNonIteratorTokenOutsideNode(sourceCode, node, nonIterator) {
	return [...(node.init.kind === 'var' ? sourceCode.getTokensBefore(node) : []),
		...sourceCode.getTokensAfter(node)]
		.filter(token => {
			return token.type === 'Identifier' && token.value === nonIterator;
		});
}

const create = context => {
	return {
		ForStatement: node => {
			checkForLoop(context, node);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
