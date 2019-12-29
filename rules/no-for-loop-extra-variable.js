'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

function checkForLoop(context, node) {
	if (checkTwoDeclaredVariables(node) && checkIteratorType(node)) {
		context.report({
			node,
			messageId: 'noForLoopExtraVariable',
			fix(fixer) {
				return fixForLoop(node, context, fixer);
			}
		});
	}
}

function checkTwoDeclaredVariables(node) {
	return node.init.type === 'VariableDeclaration' && node.init.declarations.length === 2;
}

function checkIteratorType(node) {
	let iteratorNode;
	if (node.update.type === 'AssignmentExpression') {
		iteratorNode = node.update.left;
	} else if (node.update.type === 'UpdateExpression') {
		iteratorNode = node.update.argument;
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
	const nonIterator = getVariableNames(node).filter(variableName => variableName !== getIteratorName(node))[0];
	const nonIteratorDeclaration = node.init.declarations.filter(declaration => declaration.id.name === nonIterator)[0];
	const iteratorDeclaration = node.init.declarations.filter(declaration => declaration.id.name !== nonIterator)[0];
	
	function replaceInTestFix(){
		const nonIteratorInitValue = sourceCode.getText(nonIteratorDeclaration.init);
		const nonIteratorTokensInTest = getNonIteratorTokensInNode(sourceCode, node.test, nonIterator);
		return nonIteratorTokensInTest.map(token => {
			return fixer.replaceText(token, nonIteratorInitValue);
		});

	}

	function removeDeclarationFix(){
		return [fixer.replaceText(node.init, node.init.kind + ' ' + sourceCode.getText(iteratorDeclaration))];
	}
	function moveDeclarationFix(){
		return removeDeclarationFix().concat([fixer.insertTextBefore(node, node.init.kind + ' ' + sourceCode.getText(nonIteratorDeclaration) + '\n')])
	}
	function removeVariableFix(){
		return removeDeclarationFix().concat(replaceInTestFix())
	}
	
	if(node.init.kind==='let'){
		if(checkNonIteratorUsedInNode(node, context)){
			if(checkNonIteratorUsedOutsideNode(node, context)){
				return
			}
			else{
				return moveDeclarationFix()
			}
		}
		else{
			return removeVariableFix()
		}
	}
	else {
		if (checkNonIteratorUsedInNode(node, context) || checkNonIteratorUsedOutsideNode(node, context)){
			return moveDeclarationFix()
		}
		else{
			return removeVariableFix()
		}
	}
}
	
	
function checkNonIteratorUsedInNode(node, context) {
	const nonIterator = getVariableNames(node).filter(variableName => variableName !== getIteratorName(node))[0];
	const sourceCode = context.getSourceCode();
	return getNonIteratorTokensInNode(sourceCode, node.body, nonIterator).length !== 0;
}

function getNonIteratorTokensInNode(sourceCode, node, nonIterator) {
	return sourceCode.getTokens(node).filter(token => {
		return token.type === 'Identifier' && token.value === nonIterator;
	});
}

function checkNonIteratorUsedOutsideNode(node, context) {
	const nonIterator = getVariableNames(node).filter(variableName => variableName !== getIteratorName(node))[0];
	const sourceCode = context.getSourceCode();
	return getNonIteratorTokenOutsideNode(sourceCode, node, nonIterator).length !== 0;
}

function getNonIteratorTokenOutsideNode(sourceCode, node, nonIterator) {
	const tokens = node.init.kind === 'var' ? sourceCode.getTokensBefore(node) : []
	tokens.push(...sourceCode.getTokensAfter(node))
	return tokens.filter(token => {
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
		fixable: 'code',
		messages: {
			noForLoopExtraVariable: 'Unnecessary variable in for loop.'
		}
	}
};
