import unicorn from '../index.mjs';
import {rules} from '../configs-legacy/recommended.js';

export default {
	plugins: {
		unicorn,
	},
	rules,
};
