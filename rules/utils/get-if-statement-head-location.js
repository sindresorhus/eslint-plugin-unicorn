'use strict';

/**
@typedef {line: number, column: number} Position

Get the location of the given `IfStatement` node for reporting.

@param {Node} node - The class node to get.
@param {SourceCode} sourceCode - The source code object to get tokens.
@returns {{start: Position, end: Position}} The location of the `IfStatement` node for reporting.
*/
function getIfStatementHeadLocation(node, sourceCode) {
	const {loc, consequent} = node;
	const tokenBeforeConsequent = sourceCode.getTokenBefore(consequent);

	const {start} = loc;
	const {end} = tokenBeforeConsequent.loc;

	return {start, end};
}

module.exports = getIfStatementHeadLocation;
