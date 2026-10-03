import {createBuiltinTypeCheckers} from './type-helpers.js';

const {
	isTarget: isMap,
	isKnownNonTarget: isKnownNonMap,
} = createBuiltinTypeCheckers({
	name: 'Map',
	aliases: ['ReadonlyMap'],
});

export {
	isKnownNonMap,
	isMap,
};
