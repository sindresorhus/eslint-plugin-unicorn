import getVariableIdentifiers from '../utils/get-variable-identifiers.js';
import replaceReferenceIdentifier from './replace-reference-identifier.js';

const renameVariable = (variable, name, context, fixer) =>
	getVariableIdentifiers(variable)
		.map(identifier => replaceReferenceIdentifier(identifier, name, context, fixer));

export default renameVariable;
