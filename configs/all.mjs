'use strict';
const eslintPluginUnicorn = require('../index.js');
const recommended = require('./recommended.js');

const all = {
	...recommended,
	rules: eslintPluginUnicorn.configs.all.rules,
};

export default all;
