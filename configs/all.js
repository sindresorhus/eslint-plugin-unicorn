'use strict';
const recommended = require('./recommended.js');

module.exports = Object.fromEntries(Object.entries(recommended).map(
	([ruleId, severity]) => [ruleId, ruleId.startsWith('unicorn/') ? 'error' : severity],
));
