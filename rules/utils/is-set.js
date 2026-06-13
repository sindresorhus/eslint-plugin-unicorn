import {
	createTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const setTypeNames = new Set(['Set']);
const typeReferenceAliases = new Map([
	['ReadonlySet', 'Set'],
]);

const getStaticType = value =>
	value instanceof Set ? target : unknown;

const {
	isTarget: isSet,
	isKnownNonTarget: isKnownNonSet,
} = createTypeCheckers({
	targetTypeNames: setTypeNames,
	typeReferenceAliases,
	targetConstructorNames: ['Set'],
	getStaticType,
});

export {
	isKnownNonSet,
	isSet,
};
