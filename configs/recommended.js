'use strict';
const eslintrc = require('@eslint/eslintrc')
const eslintPluginUnicorn = require('../index.js');

const {parserOptions:{ecmaVersion, sourceType}, rules} = eslintPluginUnicorn.configs.recommended
const {globals}= eslintrc.Legacy.environments.get('es2024')

const recommended = {
	languageOptions: {
		ecmaVersion,
		sourceType,
		globals,
	},
	plugins: {
		unicorn: eslintPluginUnicorn,
	},
	rules,
};

module.exports = recommended;
