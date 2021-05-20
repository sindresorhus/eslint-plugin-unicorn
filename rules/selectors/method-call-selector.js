'use strict';
const memberExpressionSelector = require('./member-expression-selector');
const {callExpressionSelector} = require('./call-or-new-expression-selector');

function methodCallSelector(options) {
	const {
		path,

		// `CallExpression` options
		length,
		min,
		max,
		includeOptionalCall,
		allowSpreadElement,

		// `MemberExpression` options
		name,
		names,
		object,
		objects,
		includeOptionalMember
	} = {
		path: '',

		min: 0,
		max: Number.POSITIVE_INFINITY,
		includeOptionalCall: false,
		allowSpreadElement: false,

		property: '',
		object: '',
		includeOptionalMember: false,

		...options
	};

	const prefix = path ? `${path}.` : '';

	return [
		callExpressionSelector({
			path,
			length,
			min,
			max,
			includeOptional: includeOptionalCall,
			allowSpreadElement
		}),
		memberExpressionSelector({
			path: `${prefix}callee`,
			name,
			names,
			object,
			objects,
			includeOptional: includeOptionalMember
		})
	].join('');
}

module.exports = methodCallSelector;
