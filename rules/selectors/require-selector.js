'use strict';
const {callExpressionSelector} = require('./call-or-new-expression-selector');

const requireCallSelector = callExpressionSelector({
	name: 'require',
	length: 1,
	// Do not add check on first argument
	allowSpreadElement: true
});

const STATIC_REQUIRE_SELECTOR = [
	requireCallSelector,
	'[arguments.0.type="Literal"]'
].join('');

const STATIC_REQUIRE_SOURCE_SELECTOR = [
	requireCallSelector,
	' > Literal.arguments'
].join('');

module.exports = {STATIC_REQUIRE_SELECTOR, STATIC_REQUIRE_SOURCE_SELECTOR};
