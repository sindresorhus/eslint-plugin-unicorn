import eslintPluginUnicorn from '../../index.js';

let {env, parserOptions} = eslintPluginUnicorn.configs.recommended;

env = {
	node: true,
	browser: true,
	...env,
};

export default {env, parserOptions};
