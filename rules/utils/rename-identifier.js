'use strict';

const isShorthandPropertyIdentifier = require('./is-shorthand-property-identifier');
const isAssignmentPatternShorthandPropertyIdentifier = require('./is-assignment-pattern-shorthand-property-identifier');
const isShorthandImportIdentifier = require('./is-shorthand-import-identifier');
const isShorthandExportIdentifier = require('./is-shorthand-export-identifier');

function renameIdentifier(identifier, name, fixer, sourceCode) {
	if (
		isShorthandPropertyIdentifier(identifier) ||
		isAssignmentPatternShorthandPropertyIdentifier(identifier)
	) {
		return fixer.replaceText(identifier, `${identifier.name}: ${name}`);
	}

	if (isShorthandImportIdentifier(identifier)) {
		return fixer.replaceText(identifier, `${identifier.name} as ${name}`);
	}

	if (isShorthandExportIdentifier(identifier)) {
		return fixer.replaceText(identifier, `${name} as ${identifier.name}`);
	}

	// `TypeParameter` default value
	if (identifier.default) {
		return fixer.replaceText(identifier, `${name} = ${sourceCode.getText(identifier.default)}`);
	}

	// `typeAnnotation`
	if (identifier.typeAnnotation) {
		return fixer.replaceTextRange(
			[identifier.range[0], identifier.typeAnnotation.range[0]],
			`${name}${identifier.optional ? '?' : ''}`
		);
	}

	return fixer.replaceText(identifier, name);
}

module.exports = renameIdentifier;
