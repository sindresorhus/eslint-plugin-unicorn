import unicorn from '../index.mjs';
import {rules} from '../configs-legacy/recommended.js';

const recommended = {
	plugins: {
		unicorn,
	},
	rules,
};

export default recommended;
