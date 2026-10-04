import {findVariable} from '@eslint-community/eslint-utils';

/**
Check if two identifiers refer to the same variable. Two unresolved identifiers (for example undeclared globals) are the same when they have the same name.

@param {import('estree').Identifier} left
@param {import('estree').Identifier} right
@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function isSameBinding(left, right, context) {
	const {sourceCode} = context;
	const leftVariable = findVariable(sourceCode.getScope(left), left);
	const rightVariable = findVariable(sourceCode.getScope(right), right);

	if (leftVariable || rightVariable) {
		return leftVariable === rightVariable;
	}

	return left.name === right.name;
}
