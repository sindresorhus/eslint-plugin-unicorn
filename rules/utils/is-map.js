import {
	createBuiltinTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const getStaticType = value =>
	value instanceof Map ? target : unknown;

const {
	isTarget: isMap,
	isKnownNonTarget: isKnownNonMap,
} = createBuiltinTypeCheckers({
	name: 'Map',
	aliases: ['ReadonlyMap'],
	getStaticType,
});

export {
	isKnownNonMap,
	isMap,
};
