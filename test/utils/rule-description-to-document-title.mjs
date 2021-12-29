/**
From a rule's description, generate the intended title for its rule doc.

@param {string} description - rule description
@returns {string} title for rule doc
*/
export default function ruleDescriptionToDocumentTitle(description) {
	let title = description.charAt(0).toUpperCase() + description.slice(1); // Capitalize first letter.
	if (title.endsWith('.')) {
		title = title.slice(0, -1); // Remove any ending period.
	}

	return title;
}
