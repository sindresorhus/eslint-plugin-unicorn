'use strict';
const eslintPluginUnicorn = require('../index.js');

const {
	parserOptions:{
		ecmaVersion,
		sourceType,
	},
	rules,
} = eslintPluginUnicorn.configs.recommended;

const recommended = {
	languageOptions: {
		ecmaVersion,
		sourceType,
	},
	plugins: {
		unicorn: eslintPluginUnicorn,
	},
	rules,
};

module.exports = recommended;
