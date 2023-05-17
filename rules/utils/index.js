'use strict';

const {
	isParenthesized,
	getParenthesizedTimes,
	getParentheses,
	getParenthesizedRange,
	getParenthesizedText,
} = require('./parentheses.js');
const {
	isArrayPrototypeProperty,
	isObjectPrototypeProperty,
} = require('./array-or-object-prototype-property.js');
const {isNodeMatches, isNodeMatchesNameOrPath} = require('./is-node-matches.js');
const {isBooleanNode, getBooleanAncestor} = require('./boolean.js');

module.exports = {
	escapeString: require('./escape-string.js'),
	getBooleanAncestor,
	getParentheses,
	getParenthesizedRange,
	getParenthesizedText,
	getParenthesizedTimes,
	getVariableIdentifiers: require('./get-variable-identifiers.js'),
	isArrayPrototypeProperty,
	isBooleanNode,
	isLogicalExpression: require('./is-logical-expression.js'),
	isNodeMatches,
	isNodeMatchesNameOrPath,
	isNodeValueNotDomNode: require('./is-node-value-not-dom-node.js'),
	isNodeValueNotFunction: require('./is-node-value-not-function.js'),
	isObjectPrototypeProperty,
	isOnSameLine: require('./is-on-same-line.js'),
	isParenthesized,
	isSameIdentifier: require('./is-same-identifier.js'),
	isSameReference: require('./is-same-reference.js'),
	isShadowed: require('./is-shadowed.js'),
	isValueNotUsable: require('./is-value-not-usable.js'),
	needsSemicolon: require('./needs-semicolon.js'),
	shouldAddParenthesesToMemberExpressionObject: require('./should-add-parentheses-to-member-expression-object.js'),
	toLocation: require('./to-location.js'),
};

