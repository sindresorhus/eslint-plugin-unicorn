import isIdentifier from 'is-identifier';

export default function isIdentifierName(name) {
	return isIdentifier(name, {checkReserved: false});
}
