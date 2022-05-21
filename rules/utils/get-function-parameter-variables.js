'use strict';

// This function is not well tested, since we only used in `prefer-await`, and it only allow one parameter in cases we fix
function getFunctionParameterVariables(parameter, context) {
	const functionVariables = context.getDeclaredVariables(parameter.parent);

	return functionVariables.filter(variable => {
		if (variable.defs.length !== 1) {
			return false;
		}

		const [definition] = variable.defs;

		if (definition.type !== 'Parameter') {
			return false;
		}

		for (let node = definition.name; ; node = node.parent) {
			if (node === parameter) {
				return true;
			} else if (node === parameter.parent) {
				break;
			}
		}

		return false;
	});
}

module.exports = getFunctionParameterVariables;
