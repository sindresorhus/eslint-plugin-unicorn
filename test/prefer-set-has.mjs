import outdent from 'outdent';
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

const methodsReturnsArray = [
	'concat',
	'copyWithin',
	'fill',
	'filter',
	'flat',
	'flatMap',
	'map',
	'reverse',
	'slice',
	'sort',
	'splice',
	'toReversed',
	'toSorted',
	'toSpliced',
	'with',
];


test.snapshot({
	testerOptions: {
		parser: parsers.babel,
		parserOptions: {
			babelOptions: {
				parserOpts: {
					plugins: [
						['decorators', {decoratorsBeforeExport: true}],
					],
				},
			},
		},
	},
	valid: [
		// https://github.com/TheThingsNetwork/lorawan-stack/blob/1dab30227e632ceade425e0c67d5f84316e830da/pkg/webui/console/containers/device-importer/index.js#L74
		outdent`
			@connect(
				state => {
					const availableComponents = ['is']
					if (nsConfig.enabled) availableComponents.push('ns')
					if (jsConfig.enabled) availableComponents.push('js')
					if (asConfig.enabled) availableComponents.push('as')

					return {
						availableComponents,
					}
				},
			)
			export default class A {}
		`,
	],
	invalid: [
	],
});
