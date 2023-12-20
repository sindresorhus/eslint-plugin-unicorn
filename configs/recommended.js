'use strict';
const eslintPluginUnicorn = require('../index.js');

const recommended = {
	files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
	languageOptions: {
		globals: {
			...globals.node,
			...globals.es2021,
		},
	},
	plugins: {
		unicorn: eslintPluginUnicorn,
	},
	rules: eslintPluginUnicorn.configs.rules,
};

module.exports = recommended;
