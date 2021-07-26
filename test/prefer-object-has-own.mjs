import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const hasProperty = Object.hasOwn(object, property);',

		// CallExpression
		'Object.prototype.hasOwnProperty.call',
		'({}).hasOwnProperty.call',
		'foo.call(Object.prototype.hasOwnProperty, Object.prototype.hasOwnProperty.call)',

		// Arguments
		'Object.prototype.hasOwnProperty.call(object)',
		'Object.prototype.hasOwnProperty.call()',
		'Object.prototype.hasOwnProperty.call(object, property, extraArgument)',
		'Object.prototype.hasOwnProperty.call(...[object, property])',
		'({}).hasOwnProperty.call(object)',
		'({}).hasOwnProperty.call()',
		'({}).hasOwnProperty.call(object, property, extraArgument)',
		'({}).hasOwnProperty.call(...[object, property])',

		// Optional
		'Object.prototype.hasOwnProperty.call?.(object, property)',
		'Object.prototype.hasOwnProperty?.call(object, property)',
		'Object.prototype?.hasOwnProperty.call(object, property)',
		'Object?.prototype.hasOwnProperty.call(object, property)',
		'({}).hasOwnProperty.call?.(object, property)',
		'({}).hasOwnProperty?.call(object, property)',
		'({})?.hasOwnProperty.call(object, property)',

		// Computed
		'Object.prototype.hasOwnProperty[call](object, property)',
		'Object.prototype[hasOwnProperty].call(object, property)',
		'Object[prototype].hasOwnProperty.call(object, property)',
		'({}).hasOwnProperty[call](object, property)',
		'({})[hasOwnProperty].call(object, property)',

		// Names
		'Object.prototype.hasOwnProperty.notCall(object, property)',
		'Object.prototype.notHasOwnProperty.call(object, property)',
		'Object.notPrototype.hasOwnProperty.call(object, property)',
		'notObject.prototype.hasOwnProperty.call(object, property)',
		'({}).hasOwnProperty.notCall(object, property)',
		'({}).notHasOwnProperty.call(object, property)',

		// Empty object
		'({notEmpty}).hasOwnProperty.call(object, property)',
		'([]).hasOwnProperty.call(object, property)',
	],
	invalid: [
		'const hasProperty = Object.prototype.hasOwnProperty.call(object, property);',
		'const hasProperty = Object.prototype.hasOwnProperty.call(object, property,);',
		'const hasProperty = (( Object.prototype.hasOwnProperty.call(object, property) ));',
		'const hasProperty = (( Object.prototype.hasOwnProperty.call ))(object, property);',
		'const hasProperty = (( Object.prototype.hasOwnProperty )).call(object, property);',
		'const hasProperty = (( Object.prototype )).hasOwnProperty.call(object, property);',
		'const hasProperty = (( Object )).prototype.hasOwnProperty.call(object, property);',
		'const hasProperty = {}.hasOwnProperty.call(object, property);',
		'const hasProperty = (( {}.hasOwnProperty.call(object, property) ));',
		'const hasProperty = (( {}.hasOwnProperty.call ))(object, property);',
		'const hasProperty = (( {}.hasOwnProperty )).call(object, property);',
		'const hasProperty = (( {} )).hasOwnProperty.call(object, property);',
		'function foo(){return{}.hasOwnProperty.call(object, property)}',
	],
});

// `functions`
test.snapshot({
	valid: [
		'_.has(object)',
		'_.has()',
		'_.has(object, property, extraArgument)',
		'_.has',
		'_.has?.(object, property)',
		'_?.has(object, property)',
		'foo.has(object, property)',
		'foo._.has(object, property)',
	],
	invalid: [
		'_.has(object, property)',
		'lodash.has(object, property)',
		'underscore.has(object, property)',
		{
			code: '_.has(object, property)',
			options: [{functions: ['utils.has']}],
		},
		{
			code: 'utils.has(object, property)',
			options: [{functions: ['utils.has']}],
		},
	],
});
