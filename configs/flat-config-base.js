'use strict';
const eslintrc = require('@eslint/eslintrc');

const {globals} = eslintrc.Legacy.environments.get('es2024');

module.exports = {
	languageOptions: {
		globals,
	},
};
