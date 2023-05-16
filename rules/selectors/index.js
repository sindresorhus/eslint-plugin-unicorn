'use strict';

module.exports = {
	// Utilities
	matches: require('./matches-any.js'),
	not: require('./negation.js'),

	emptyArraySelector: require('./empty-array-selector.js'),
	emptyObjectSelector: require('./empty-object-selector.js'),
	memberExpressionSelector: require('./member-expression-selector.js'),
	methodCallSelector: require('./method-call-selector.js'),
	callExpressionSelector: require('./call-or-new-expression-selector.js').callExpressionSelector,
	newExpressionSelector: require('./call-or-new-expression-selector.js').newExpressionSelector,
};
