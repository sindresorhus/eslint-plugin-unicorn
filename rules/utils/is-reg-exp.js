import {isRegexLiteral} from '../ast/index.js';
import {
	createBuiltinTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const getStaticType = value =>
	Object.prototype.toString.call(value) === '[object RegExp]' ? target : unknown;

const {
	isTarget: isRegExp,
	isKnownNonTarget: isKnownNonRegExp,
} = createBuiltinTypeCheckers({
	name: 'RegExp',
	targetCallNames: ['RegExp'],
	isTargetNode: isRegexLiteral,
	getStaticType,
});

export {
	isKnownNonRegExp,
	isRegExp,
};
