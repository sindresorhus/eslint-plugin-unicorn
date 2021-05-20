'use strict';
const {callExpressionSelector} = require('./call-or-new-expression-selector');

function requireSelector() {
	return [
		callExpressionSelector({name: 'require', length: 1}),
		'[arguments.0.type="Literal"]'
	].join('')
}

module.exports = requireSelector;
