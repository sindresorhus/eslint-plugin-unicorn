import {isSameBinding, isSameReference, unwrapTypeScriptExpression} from '../utils/index.js';

export default function isSameCollectionReference(left, right, context) {
	left = unwrapTypeScriptExpression(left);
	right = unwrapTypeScriptExpression(right);

	if (left.type === 'ChainExpression' || right.type === 'ChainExpression') {
		return false;
	}

	if (left.type === 'Identifier' && right.type === 'Identifier') {
		return isSameBinding(left, right, context);
	}

	if (left.type === 'MemberExpression' && right.type === 'MemberExpression') {
		return !left.computed
			&& !right.computed
			&& !left.optional
			&& !right.optional
			&& isSameReference(left.property, right.property)
			&& isSameCollectionReference(left.object, right.object, context);
	}

	// Each evaluation of a regular expression literal creates a distinct object.
	return !left.regex && isSameReference(left, right);
}
