import {isRegexLiteral} from '../ast/index.js';
import {
	createTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const regExpTypeNames = new Set(['RegExp']);

const getStaticType = value =>
	Object.prototype.toString.call(value) === '[object RegExp]' ? target : unknown;

const {
	isTarget: isRegExp,
	isKnownNonTarget: isKnownNonRegExp,
} = createTypeCheckers({
	targetTypeNames: regExpTypeNames,
	targetConstructorNames: ['RegExp'],
	targetCallNames: ['RegExp'],
	isTargetNode: isRegexLiteral,
	getStaticType,
});

export {
	isKnownNonRegExp,
	isRegExp,
};
