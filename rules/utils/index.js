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

module.exports = {
	getParentheses,
	getParenthesizedRange,
	getParenthesizedText,
	getParenthesizedTimes,
	isArrayPrototypeProperty,
	isNodeMatches,
	isNodeMatchesNameOrPath,
	isNodeValueNotDomNode: require('./is-node-value-not-dom-node.js'),
	isNodeValueNotFunction: require('./is-node-value-not-function.js'),
	isObjectPrototypeProperty,
	isParenthesized,
	isValueNotUsable: require('./is-value-not-usable.js'),
	needsSemicolon: require('./needs-semicolon.js'),
	shouldAddParenthesesToMemberExpressionObject: require('./should-add-parentheses-to-member-expression-object.js'),
};
