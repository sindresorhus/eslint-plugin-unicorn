'use strict';
const eslintrc = require('@eslint/eslintrc');
const legacyConfigBase = require('./legacy-config-base.js');

const {
	parserOptions: {
		ecmaVersion,
		sourceType,
	},
} = legacyConfigBase;

const {globals} = eslintrc.Legacy.environments.get('es2024');

module.exports = {
	languageOptions: {
		ecmaVersion,
		sourceType,
		globals,
	},
};
