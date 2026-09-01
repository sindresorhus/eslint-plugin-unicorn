import identifierRegex from 'identifier-regex';

const identifierNameRegex = identifierRegex({checkReserved: false});

export default function isIdentifierName(name) {
	return identifierNameRegex.test(name);
}
