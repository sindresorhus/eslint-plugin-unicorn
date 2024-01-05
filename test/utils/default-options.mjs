
import * as espree from 'espree';

// TODO: Use espree
const defaultOptions = {
	languageOptions: {
		sourceType: 'module',
		parser: espree,
	},
};

export default defaultOptions;
