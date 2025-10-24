import isShorthandPropertyValue from '../utils/is-shorthand-property-value.js';
import isShorthandPropertyAssignmentPatternLeft from '../utils/is-shorthand-property-assignment-pattern-left.js';
import isShorthandImportLocal from '../utils/is-shorthand-import-local.js';
import isShorthandExportLocal from '../utils/is-shorthand-export-local.js';

export default function replaceReferenceIdentifier(identifier, replacement, context, fixer) {
	if (
		isShorthandPropertyValue(identifier)
		|| isShorthandPropertyAssignmentPatternLeft(identifier)
	) {
		return fixer.replaceText(identifier, `${identifier.name}: ${replacement}`);
	}

	if (isShorthandImportLocal(identifier, context)) {
		return fixer.replaceText(identifier, `${identifier.name} as ${replacement}`);
	}

	if (isShorthandExportLocal(identifier, context)) {
		return fixer.replaceText(identifier, `${replacement} as ${identifier.name}`);
	}

	// `typeAnnotation`
	if (identifier.typeAnnotation) {
		const {sourceCode} = context;
		return fixer.replaceTextRange(
			[sourceCode.getRange(identifier)[0], sourceCode.getRange(identifier.typeAnnotation)[0]],
			`${replacement}${identifier.optional ? '?' : ''}`,
		);
	}

	return fixer.replaceText(identifier, replacement);
}
