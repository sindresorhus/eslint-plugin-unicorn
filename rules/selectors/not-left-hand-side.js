'use strict';
const not = require('./negation.js');

function notLeftHandSideSelector(path) {
	const prefix = path ? `${path}.` : '';

	// Keep logic sync with `../utils/is-left-hand-side.js`
	return not([
		`[${prefix}type="AssignmentExpression"] > .left`,
		`[${prefix}type="UpdateExpression"] > .argument`,
		`[${prefix}type="UnaryExpression"][${prefix}operator="delete"] > .argument`,
	]);
}

module.exports = notLeftHandSideSelector;
