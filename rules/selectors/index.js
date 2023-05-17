'use strict';

module.exports = {
	// Utilities
	matches: require('./matches-any.js'),
	not: require('./negation.js'),

	methodCallSelector: require('./method-call-selector.js'),
	callExpressionSelector: require('./call-or-new-expression-selector.js').callExpressionSelector,
	newExpressionSelector: require('./call-or-new-expression-selector.js').newExpressionSelector,
};
