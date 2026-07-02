// https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/rules/RulesOfHooks.ts
const isReactHookName = name =>
	name === 'use' || /^use[\dA-Z]/.test(name);

export default isReactHookName;
