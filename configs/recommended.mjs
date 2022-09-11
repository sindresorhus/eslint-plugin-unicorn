import globals from 'globals';
import unicorn from '../index.mjs';
import {rules} from '../configs-legacy/recommended.js';

const recommended = {
	files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
	languageOptions: {
		globals: {
			...globals.node,
			...globals.es2021,
		},
	},
	plugins: {
		unicorn,
	},
	rules,
};

export default recommended;
