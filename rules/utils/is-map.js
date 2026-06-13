import {
	createTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const mapTypeNames = new Set(['Map']);
const typeReferenceAliases = new Map([
	['ReadonlyMap', 'Map'],
]);

const getStaticType = value =>
	value instanceof Map ? target : unknown;

const {
	isTarget: isMap,
	isKnownNonTarget: isKnownNonMap,
} = createTypeCheckers({
	targetTypeNames: mapTypeNames,
	typeReferenceAliases,
	targetConstructorNames: ['Map'],
	getStaticType,
});

export {
	isKnownNonMap,
	isMap,
};
