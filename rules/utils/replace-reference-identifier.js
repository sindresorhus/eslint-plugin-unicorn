'use strict';

const isShorthandPropertyValue = require('./is-shorthand-property-value');
const isShorthandPropertyAssignmentPatternLeft = require('./is-shorthand-property-assignment-pattern-left');
const isShorthandImportLocal = require('./is-shorthand-import-local');
const isShorthandExportLocal = require('./is-shorthand-export-local');

function replaceReferenceIdentifier(identifier, replacement, fixer) {
	if (
		isShorthandPropertyValue(identifier) ||
		isShorthandPropertyAssignmentPatternLeft(identifier)
	) {
		return fixer.replaceText(identifier, `${identifier.name}: ${replacement}`);
	}

	if (isShorthandImportLocal(identifier)) {
		return fixer.replaceText(identifier, `${identifier.name} as ${replacement}`);
	}

	if (isShorthandExportLocal(identifier)) {
		return fixer.replaceText(identifier, `${replacement} as ${identifier.name}`);
	}

	// `typeAnnotation`
	if (identifier.typeAnnotation) {
		return fixer.replaceTextRange(
			[identifier.range[0], identifier.typeAnnotation.range[0]],
			`${replacement}${identifier.optional ? '?' : ''}`
		);
	}

	return fixer.replaceText(identifier, replacement);
}

module.exports = replaceReferenceIdentifier;
