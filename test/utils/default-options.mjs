import eslintPluginUnicorn from '../../index.js';

const {env, parserOptions} = eslintPluginUnicorn.configs.recommended;

const defaultOptions = {
	env: {
		node: true,
		browser: true,
		...env,
	},
	parserOptions,
};

export default defaultOptions;
