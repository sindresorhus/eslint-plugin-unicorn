'use strict';

module.exports = {
	// Utilities
	matches: require('./matches-any'),
	not: require('./negation'),

	arrayPrototypeMethodSelector: require('./prototype-method-selector').arrayPrototypeMethodSelector,
	objectPrototypeMethodSelector: require('./prototype-method-selector').objectPrototypeMethodSelector,
	emptyArraySelector: require('./empty-array-selector'),
	memberExpressionSelector: require('./member-expression-selector'),
	methodCallSelector: require('./method-call-selector'),
	notDomNodeSelector: require('./not-dom-node').notDomNodeSelector,
	notFunctionSelector: require('./not-function').notFunctionSelector,
	referenceIdentifierSelector: require('./reference-identifier-selector'),
	callExpressionSelector: require('./call-or-new-expression-selector').callExpressionSelector,
	newExpressionSelector: require('./call-or-new-expression-selector').newExpressionSelector,
	callOrNewExpressionSelector: require('./call-or-new-expression-selector').callOrNewExpressionSelector,
	STATIC_REQUIRE_SELECTOR: require('./require-selector').STATIC_REQUIRE_SELECTOR,
	STATIC_REQUIRE_SOURCE_SELECTOR: require('./require-selector').STATIC_REQUIRE_SOURCE_SELECTOR
};
