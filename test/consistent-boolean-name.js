import test from 'ava';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const typescript = testCase => typeof testCase === 'string'
	? {
		code: testCase,
		languageOptions: {parser: parsers.typescript},
	}
	: {
		...testCase,
		languageOptions: {
			...testCase.languageOptions,
			parser: parsers.typescript,
		},
	};

// Type information needs the raw TypeScript parser because the shared `parsers.typescript`
// helper injects `project: []`, which conflicts with `projectService`.
const typeAware = testCase => {
	testCase = typeof testCase === 'string' ? {code: testCase} : testCase;

	return {
		...testCase,
		filename: 'file.ts',
		languageOptions: {
			...testCase.languageOptions,
			parser: typescriptEslintParser,
			parserOptions: {
				...testCase.languageOptions?.parserOptions,
				projectService: {allowDefaultProject: ['*.ts']},
			},
		},
	};
};

const invalidBooleanPrefix = (code, count = 1) => typeAware({
	code,
	errors: Array.from({length: count}, () => ({messageId: 'non-boolean-prefix'})),
});

const onlyIsPrefixOptions = {
	prefixes: {
		are: false,
		has: false,
		have: false,
		can: false,
		should: false,
		was: false,
		were: false,
		did: false,
		will: false,
		requires: false,
	},
};

ruleTest({
	valid: [
		{
			code: 'function useReady() { return true; }',
			options: [{
				...onlyIsPrefixOptions,
				ignore: ['^useReady$'],
			}],
		},
	],
	invalid: [
		{
			code: 'function foo() { const completed = true; return completed; }',
			output: 'function foo() { const isCompleted = true; return isCompleted; }',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		typescript({
			code: 'function foo() { let completed: boolean; completed = true; return completed; }',
			output: 'function foo() { let isCompleted: boolean; isCompleted = true; return isCompleted; }',
			options: [onlyIsPrefixOptions],
			errors: 1,
		}),
		typescript({
			code: 'function foo() { const completed /* keep */: boolean = true; return completed; }',
			output: 'function foo() { const isCompleted /* keep */: boolean = true; return isCompleted; }',
			options: [onlyIsPrefixOptions],
			errors: 1,
		}),
		typescript({
			code: 'function isFoo(completed /* keep */: boolean) { return completed; }',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					suggestions: [
						{
							messageId: 'rename',
							output: 'function isFoo(isCompleted /* keep */: boolean) { return isCompleted; }',
						},
					],
				},
			],
		}),
		typescript({
			code: 'declare function useMyFlag(): boolean;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					suggestions: [
						{
							messageId: 'rename',
							output: 'declare function useIsMyFlag(): boolean;',
						},
					],
				},
			],
		}),
		typeAware({
			code: 'declare function useRef<T>(value: T): {current: T}; const hasConsentRef = useRef("no");',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'declare function useRef<T>(value: T): {current: T}; const hasConsent = useRef(false);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'declare function useRef<T>(value: T): {current: T}; const isHandlerRef = useRef(() => true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'declare function useRef<T>(value: T): {current: T}; const isPredicate = () => true; const isHandlerRef = useRef(isPredicate);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'declare function useRef<T>(value: T): {current: T}; let hasConsentRef = useRef(false); hasConsentRef = "yes";',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; const isBranch = ref("main");',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; const isHandler = ref(() => true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; const isPredicate = () => true; const isHandler = ref(isPredicate);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; const hasDepartment = computed(() => "sales");',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Ref<T>; declare const getDepartment: () => string; const hasDepartment = computed(getDepartment);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; const hasDepartment = computed(async () => true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; const hasDepartment = computed((function* () { yield true; }) as () => boolean);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; const getDepartment = async () => true; const hasDepartment = computed(getDepartment);',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; const hasDepartment = computed(true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; const hasDepartment = computed(() => () => true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; let isBranch = ref(false); isBranch = ref(true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function vueRef<T>(value: T): Ref<T>; const isBranch = vueRef(false);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare const Vue: {ref<T>(value: T): Ref<T>}; const isBranch = Vue.ref(false);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function vueComputed<T>(getter: () => T): Ref<T>; const hasDepartment = vueComputed(() => true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare const Vue: {computed<T>(getter: () => T): Ref<T>}; const hasDepartment = Vue.computed(() => true);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function shallowRef<T>(value: T): Ref<T>; const isBranch = shallowRef(false);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(options: {get(): T; set(value: T): void}): Ref<T>; const hasDepartment = computed({get: () => true, set() {}});',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			code: 'interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Readonly<Ref<T>>; let hasDepartment = computed(() => true); hasDepartment = computed(() => false);',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		{
			code: 'function useReady() { return true; }',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'function useIsReady() { return true; }',
						},
					],
				},
			],
		},
		{
			code: 'function useREADY() { return true; }',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'READY',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'function useIS_READY() { return true; }',
						},
					],
				},
			],
		},
		{
			code: 'function use2FA() { return true; }',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: '2FA',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'function useIs2FA() { return true; }',
						},
					],
				},
			],
		},
		{
			code: 'function useReady() { return true; }',
			options: [{
				...onlyIsPrefixOptions,
				ignore: ['^ready$'],
			}],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'function useIsReady() { return true; }',
						},
					],
				},
			],
		},
		{
			code: 'function useIS_COOL() { return 1; }',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'non-boolean-prefix',
					data: {
						name: 'IS_COOL',
						prefix: 'is',
					},
				},
			],
		},
		{
			code: 'const useReady = () => true;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'const useIsReady = () => true;',
						},
					],
				},
			],
		},
		typescript({
			code: 'declare const useReady: () => boolean;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'declare const useIsReady: () => boolean;',
						},
					],
				},
			],
		}),
		typescript({
			code: 'type Hook = () => boolean; declare const useReady: Hook;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'type Hook = () => boolean; declare const useIsReady: Hook;',
						},
					],
				},
			],
		}),
		typescript({
			code: 'interface Hook {(): boolean;} declare const useReady: Hook;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'interface Hook {(): boolean;} declare const useIsReady: Hook;',
						},
					],
				},
			],
		}),
		typescript({
			code: 'declare const useReady: {(): boolean};',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'ready',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'declare const useIsReady: {(): boolean};',
						},
					],
				},
			],
		}),
		typescript({
			code: 'declare function useIsCool(): number;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'non-boolean-prefix',
					data: {
						name: 'isCool',
						prefix: 'is',
					},
				},
			],
		}),
		typescript({
			code: 'declare const useIsCool: {(): number};',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'non-boolean-prefix',
					data: {
						name: 'isCool',
						prefix: 'is',
					},
				},
			],
		}),
		typescript({
			code: 'type Hook = () => number; declare const useIsCool: Hook;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'non-boolean-prefix',
					data: {
						name: 'isCool',
						prefix: 'is',
					},
				},
			],
		}),
		typescript({
			code: 'interface Hook {(): number;} declare const useIsCool: Hook;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'non-boolean-prefix',
					data: {
						name: 'isCool',
						prefix: 'is',
					},
				},
			],
		}),
		typescript({
			code: 'declare const useIsCool: (() => number) | undefined;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'non-boolean-prefix',
					data: {
						name: 'isCool',
						prefix: 'is',
					},
				},
			],
		}),
		{
			code: 'const useIsReady = true;',
			output: 'const isUseIsReady = true;',
			options: [onlyIsPrefixOptions],
			errors: [
				{
					messageId: 'consistent-boolean-name',
					data: {
						name: 'useIsReady',
						prefixes: '`is`',
					},
					suggestions: [
						{
							messageId: 'rename',
							output: 'const isUseIsReady = true;',
						},
					],
				},
			],
		},
		typescript({
			code: 'declare const completed: boolean;',
			options: [onlyIsPrefixOptions],
			errors: 1,
		}),
		{
			code: 'const completed = true;',
			output: 'const isCompleted = true;',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'const completed = true;',
			languageOptions: {sourceType: 'script'},
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'export const completed = true;',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'const completed = true; export {completed};',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'const completed = true; export {completed as isCompleted};',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'const completed = true; export default completed;',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'function isDownloaded(showProgress = false) { return showProgress; }',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		{
			code: 'function foo() { const completed = true; return completed; }',
			output: 'function foo() { const isCompleted = true; return isCompleted; }',
			errors: 1,
		},
		{
			code: [
				'const completed = true;',
				'',
				'function foo() {',
				'\tconst isCompleted = false;',
				'\treturn completed;',
				'}',
			].join('\n'),
			errors: 1,
		},
		{
			code: 'function foo() { const completed = () => true; return completed; }',
			options: [onlyIsPrefixOptions],
			errors: 1,
		},
		typescript({
			code: 'function foo() { const completed: () => boolean = getCompleted; return completed; }',
			options: [onlyIsPrefixOptions],
			errors: 1,
		}),
	],
});

ruleTest.snapshot({
	valid: [
		'const isCompleted = true;',
		'const hasCompleted = true;',
		'const canComplete = true;',
		'const shouldComplete = true;',
		'const wasCompleted = true;',
		'const didComplete = true;',
		'const willComplete = true;',
		'const requiresLogin = true;',
		'function requireLogin() {}',
		'const _isCompleted = true;',
		'const __isCompleted = true;',
		'const is_ready = true;',
		'const is2FAEnabled = true;',
		'const IS_COMPLETED = true;',
		'const _IS_COMPLETED = true;',
		'const completed = 1;',
		'const completed = object && object.property;',
		'const completed = object || object.property;',
		'const completed = maybeBoolean;',
		'const isCompleted = maybeBoolean;',
		'const isReady = value;',
		'function completed() { return () => true; }',
		'const completed = () => () => true;',
		'const island = 1;',
		'const completed = new Boolean(value);',
		'const completed = object.has(value);',
		'const completed = object.includes(value);',
		'const completed = array?.includes(value);',
		'const completed = set?.has(value);',
		'const completed = pattern?.test(value);',
		'const completed = Array.isArray?.(value);',
		'let array = [1]; array = object; const completed = array.includes(1);',
		'const object = {includes() { return "yes"; }}; const completed = object.includes(value);',
		'const Array = {isArray() { return "yes"; }}; const completed = Array.isArray(value);',
		'const Number = {isFinite() { return "yes"; }}; const completed = Number.isFinite(value);',
		'const Object = {hasOwn() { return "yes"; }}; const completed = Object.hasOwn(object, property);',
		'const Object = {isFrozen() { return "yes"; }}; const completed = Object.isFrozen(object);',
		'const Reflect = {has() { return "yes"; }}; const completed = Reflect.has(object, property);',
		'const URL = {canParse() { return "yes"; }}; const completed = URL.canParse(value);',
		'const Set = class { has() { return "yes"; } }; const set = new Set(); const completed = set.has(value);',
		'const Set = class { isSubsetOf() { return "yes"; } }; const set = new Set(); const completed = set.isSubsetOf(value);',
		'const Map = class { has() { return "yes"; } }; const map = new Map(); const completed = map.has(value);',
		'const RegExp = class { test() { return "yes"; } }; const pattern = new RegExp("unicorn"); const completed = pattern.test(value);',
		'const RegExp = class { constructor() { this.global = "yes"; } }; const pattern = new RegExp("unicorn"); const completed = pattern.global;',
		'const pattern = {global: "yes"}; const completed = pattern.global;',
		'const pattern = /unicorn/; const completed = pattern.source;',
		'const pattern = /unicorn/; const completed = pattern.lastIndex;',
		'const completed = pattern?.global;',
		'const set = new Set(); const completed = set?.has(value);',
		'const completed = new WeakSet().isSubsetOf(value);',
		'function getCompleted() { return value; } const completed = getCompleted();',
		'function getCompleted() { return true; return false; } const completed = getCompleted();',
		'async function getCompleted() { return true; } const completed = getCompleted();',
		'function* getCompleted() { return true; } const completed = getCompleted();',
		'let isReady = true; isReady = false;',
		'let isPredicate = () => true; isPredicate = () => false; const completed = isPredicate();',
		'let isPredicate = () => true; const task = {completed: isPredicate};',
		'let completed = true; completed = "yes";',
		'function isCompleted() { return true; }',
		'function download(shouldShowProgress = false) {}',
		'const hasCompleted = () => true;',
		'const canComplete = function () { return true; };',
		'const task = {completed: progress === 100};',
		'const {completed} = task;',
		'const {isReady = "yes"} = task;',
		'function foo({completed = true}) {}',
		'function foo({isReady = "yes"} = {}) {}',
		'function foo([completed = true]) {}',
		'function foo([isReady = "yes"] = []) {}',
		'import completed from "completed";',
		'function completed() {}',
		'class completed {}',
		'try {} catch (completed) {}',
		'/* global isReady:writable */ isReady = "yes";',
		'class isReady {} isReady = "yes";',
		'try {} catch (isReady) { isReady = "yes"; }',
		{
			code: 'const needsUpdate = true; const didUpdate = true;',
			options: [{prefixes: {needs: true}}],
		},
		{
			code: 'const tracksReady = 1;',
			options: [{prefixes: {tracks: false}}],
		},
		{
			code: 'const hasName = "Sindre";',
			options: [{prefixes: {has: false}}],
		},
		{
			code: 'const completed = true;',
			options: [{
				prefixes: {
					is: false,
					are: false,
					has: false,
					have: false,
					can: false,
					should: false,
					was: false,
					were: false,
					did: false,
					will: false,
					requires: false,
				},
			}],
		},
		// Plural prefixes are allowed by default.
		'const areFilesValid = true;',
		'const haveItemsLoaded = true;',
		'const wereLoaded = true;',
		'function areFilesValid() { return true; }',
		// `ignore` exempts matching names.
		{
			code: 'const value = true;',
			options: [{ignore: ['value']}],
		},
		{
			code: 'const completed = true;',
			options: [{ignore: ['^completed$']}],
		},
		{
			code: 'const completed = true;',
			options: [{ignore: [/^completed$/]}],
		},
		{
			code: 'const firstCompleted = true; const secondCompleted = true;',
			options: [{ignore: [/Completed/g]}],
		},
		{
			code: 'const valueIsSet = true;',
			options: [{ignore: ['value']}],
		},
		// A name is exempt if any pattern matches.
		{
			code: 'const completed = true;',
			options: [{ignore: ['other', 'completed']}],
		},
		{
			code: 'const o = {completed: true};',
			options: [{checkMethods: 'always', checkFields: 'always', ignore: ['completed']}],
		},
		typescript('const completed: boolean | undefined = true;'),
		typescript('type MaybeBoolean = boolean | undefined; const completed: MaybeBoolean = true;'),
		typeAware('declare function useRef<T>(value: T): {current: T}; const consentRef = useRef(false);'),
		typeAware('declare function useRef<T>(value: T): {current: T}; const hasConsentRef = useRef(false);'),
		typeAware('declare function useRef<T>(value: T): {current: T}; const hasConsentReference = useRef(false);'),
		typeAware('declare const React: {useRef<T>(value: T): {current: T}}; const isMountedRef = React.useRef(false);'),
		typeAware('interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; const isBranch = ref(false);'),
		typeAware('interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; let isBranch = ref(false);'),
		typeAware('interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; const isBranch = ref(value === true);'),
		typeAware('declare function computed<T>(getter: () => T): {value: T}; declare const departments: unknown[]; const hasDepartment = computed(() => departments.length > 0);'),
		typeAware('interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Ref<T>; let hasDepartment = computed(() => true);'),
		typeAware('interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Ref<T>; declare const isAvailable: () => boolean; const hasDepartment = computed(isAvailable);'),
		typeAware('declare const isSet: boolean; declare function computed<T>(getter: () => T): {value: T}; const hasDepartment = computed(() => { const isValue = isSet; return isValue; });'),
		typeAware([
			'declare module "vue" { export function ref<T>(value: T): {value: T}; export function computed<T>(getter: () => T): {value: T}; }',
			'import {ref, computed} from "vue";',
			'const isReady: {value: boolean} = ref(false); const hasReady: {value: boolean} = computed(() => true);',
		].join('\n')),
		'function useIsReady() { return true; }',
		typescript('declare function useIsMyFlag(): boolean;'),
		typescript('const useIsReady = () => true;'),
		typescript('declare const useIsReady: () => boolean;'),
		typescript('type Hook = () => boolean; declare const useIsReady: Hook;'),
		typescript('interface Hook {(): boolean;} declare const useIsReady: Hook;'),
		'function useIS_READY() { return true; }',
		// Nullable function types are not treated as boolean-returning hooks.
		typescript('declare const useIsReady: (() => boolean) | undefined;'),
		typescript('type Hook = (() => boolean) | undefined; declare const useIsReady: Hook;'),
		typescript('declare const useReady: (() => boolean) | undefined;'),
		typescript('type Hook = (() => boolean) | undefined; declare const useReady: Hook;'),
		'function useCool() { return 1; }',
		typescript('declare function useCool(): number;'),
		typescript('declare const useCool: () => number;'),
		typescript('type Hook = () => number; declare const useCool: Hook;'),
		typescript('declare const useCool: (() => number) | undefined;'),
		'async function isReady() { return true; }',
		'const isReady = async () => true;',
		'let isReady = true; isReady &&= false;',
		'let isReady = true; isReady ||= false; isReady ??= true;',
		'let isReady = true; [isReady] = [false];',
		'let isReady = true; for (isReady of [false]) {}',
		'let completed = true; completed++;',
		'let completed = true; completed += false;',
		typeAware('interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Ref<T>; const isReady = computed((() => true) as () => boolean);'),
		typeAware('interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Ref<T>; const isReady = computed((() => true) satisfies () => boolean);'),
		typeAware('interface Ref<T> {value: T} declare function computed<T>(getter: () => T): Ref<T>; declare const isGetter: () => boolean; const isReady = computed(isGetter!);'),
		typeAware('interface Ref<T> {value: T} declare function ref<T>(value: T): Ref<T>; let isReady = ref(false); isReady.value = true;'),
	],
	invalid: [
		'const completed = true;',
		'const completed = false;',
		// A plural prefix must be a distinct word part, so these are still reported.
		'const area = true;',
		'const haven = false;',
		// `ignore` patterns that do not match still report.
		{
			code: 'const completed = true;',
			options: [{ignore: ['other']}],
		},
		'const wasRed = 2;',
		'const hasName = "Sindre";',
		'const requiresLogin = "yes";',
		'const isReady = () => "yes";',
		'const isReady = async () => "yes";',
		'function hasTitle() { return "Unicorn"; }',
		'function isReady() {}',
		'function isReady() { return "yes"; }',
		'async function isReady() { return "yes"; }',
		'function* isReady() { yield true; }',
		'async function* isReady() { yield true; }',
		'function isReady() { return () => true; }',
		'const isReady = () => () => true;',
		'const isPredicate = () => true; function isReady() { return isPredicate; }',
		'function isPredicate() { return true; } function isReady() { return isPredicate; }',
		'function isReady() { return condition ? () => true : () => false; }',
		'let predicate; function isReady() { return (predicate = () => true); }',
		'function isReady() { return (doSomething(), () => true); }',
		'const isReady = () => {};',
		'function isReady() { return; }',
		'let isReady = true; isReady = "yes";',
		'let isPredicate = () => true; isPredicate = () => "yes"; const completed = isPredicate();',
		'function isPredicate() { return true; } isPredicate = () => "yes"; const completed = isPredicate();',
		'function isPredicate() { return true; } isPredicate = () => "yes"; const task = {completed: isPredicate};',
		{
			code: 'const tracksReady = 1;',
			options: [{prefixes: {tracks: true}}],
		},
		// Underscore-prefixed SCREAMING_SNAKE: the underscore is preserved and `IS_` prepended
		'const _COMPLETED = true;',
		'const completed = progress === 100;',
		'const hasProperty = key in object; const completed = hasProperty;',
		'const completed = key in object;',
		'const completed = value instanceof Error;',
		'const completed = Boolean(value);',
		'const completed = isFinite(value);',
		'const completed = isNaN(value);',
		'const completed = delete object.property;',
		'const completed = !value;',
		'const completed = Array.isArray(value);',
		'const completed = ArrayBuffer.isView(value);',
		'const completed = Atomics.isLockFree(4);',
		'const completed = Number.isFinite(value);',
		'const completed = Number.isInteger(value);',
		'const completed = Number.isNaN(value);',
		'const completed = Number.isSafeInteger(value);',
		'const completed = Object.hasOwn(object, property);',
		'const completed = Object.is(value, otherValue);',
		'const completed = Object.isExtensible(object);',
		'const completed = Object.isFrozen(object);',
		'const completed = Object.isSealed(object);',
		'const completed = Reflect.deleteProperty(object, property);',
		'const completed = Reflect.has(object, property);',
		'const completed = URL.canParse(value);',
		'const completed = "hello".includes("h");',
		'const completed = "hello".startsWith("h");',
		'const completed = `hello`.endsWith("o");',
		'const completed = [1, 2, 3].includes(2);',
		'const completed = [1, 2, 3].some(Boolean);',
		'const completed = [1, 2, 3].every(Boolean);',
		'const array = [1, 2, 3]; const completed = array.includes(2);',
		'const array = [1, 2, 3]; const completed = array["some"](Boolean);',
		'const array = [1, 2, 3]; const completed = array.every(Boolean);',
		'const set = new Set(); const completed = set.has(value);',
		'const set = new Set(); const completed = set.isSubsetOf(other);',
		'const set = new Set(); const completed = set["isSubsetOf"](other);',
		'const set = new Set(); const completed = set.isSupersetOf(other);',
		'const set = new Set(); const completed = set.isDisjointFrom(other);',
		'const completed = new Set().isDisjointFrom(other);',
		'const weakSet = new WeakSet(); const completed = weakSet.has(value);',
		'const map = new Map(); const completed = map.has(key);',
		'const weakMap = new WeakMap(); const completed = weakMap.has(key);',
		'const completed = /unicorn/.test(value);',
		'const completed = /unicorn/.global;',
		'const completed = /unicorn/i.ignoreCase;',
		'const completed = /unicorn/m.multiline;',
		'const completed = /unicorn/s.dotAll;',
		'const completed = /unicorn/u.unicode;',
		'const completed = /unicorn/y.sticky;',
		'const completed = /unicorn/d.hasIndices;',
		'const pattern = /unicorn/; const completed = pattern.test(value);',
		'const pattern = /unicorn/; const completed = pattern.global;',
		'const pattern = /unicorn/; const completed = pattern?.global;',
		'const pattern = /unicorn/; const completed = pattern["sticky"];',
		'const pattern = new RegExp("unicorn"); const completed = pattern.test(value);',
		'const pattern = new RegExp("unicorn"); const completed = pattern.multiline;',
		'const completed = new RegExp("unicorn").unicodeSets;',
		'const text = "unicorn"; const completed = text.includes("corn");',
		'const text = `unicorn`; const completed = text.startsWith("uni");',
		'const text = "unicorn"; const completed = text.isWellFormed();',
		'const text = "unicorn"; const completed = text["isWellFormed"]();',
		'const completed = "unicorn".isWellFormed();',
		'function getCompleted() { return true; } const completed = getCompleted();',
		'const getCompleted = function () { return progress === 100; }; const completed = getCompleted();',
		'const getCompleted = () => progress === 100; const completed = getCompleted();',
		'const island = true;',
		'const candy = true;',
		'const willow = true;',
		'const haste = true;',
		'const isReady = true; const hasAccess = true; const completed = isReady && hasAccess;',
		'const isReady = true; const hasAccess = true; const completed = isReady || hasAccess;',
		'const completed = condition ? true : false;',
		'const completed = (doSomething(), true);',
		'const isReady = true; function foo() { const completed = isReady; }',
		[
			'const completed = true;',
			'',
			'const task = {completed};',
		].join('\n'),
		'export const completed = true;',
		'const completed = true; export {completed};',
		'const completed = true; export {completed as isCompleted};',
		[
			'const completed = true;',
			'',
			'function foo() {',
			'\tconst isCompleted = false;',
			'\treturn completed;',
			'}',
		].join('\n'),
		[
			'const completed = true;',
			'',
			'function foo() {',
			'\tconst isCompleted = false;',
			'\tconst hasCompleted = false;',
			'\tconst canCompleted = false;',
			'\tconst shouldCompleted = false;',
			'\tconst wasCompleted = false;',
			'\tconst didCompleted = false;',
			'\tconst willCompleted = false;',
			'\treturn completed;',
			'}',
		].join('\n'),
		{
			code: 'const didUpdate = true;',
			options: [{prefixes: {did: false}}],
		},
		{
			code: 'const completed = true;',
			options: [{prefixes: {tracks: true}}],
		},
		'function completed() { return true; }',
		'const completed = () => true;',
		'const completed = function () { return progress === 100; };',
		'function completed(value) { return value === true; } completed(true);',
		'export function completed() { return true; }',
	],
});

ruleTest.snapshot({
	valid: [
		typescript('const isCompleted: boolean = true;'),
		typescript('const wasCompleted: true = true;'),
		typescript('type BooleanAlias = boolean; const isCompleted: BooleanAlias = true;'),
		typescript('function download(shouldShowProgress: boolean) {}'),
		typescript('class Task { constructor(readonly isCompleted = false) {} }'),
		typescript('class Task { constructor(public isReady: boolean) {} }'),
		// A setter parameter's name is positional and dictated by the accessor.
		typescript('const task = {set completed(value: boolean) {}};'),
		typescript('class Task { set completed(value: boolean) {} }'),
		typescript('class Task { set completed(value: boolean = false) {} }'),
		typescript({
			code: 'interface Task { set isReady(value: boolean): void; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript('abstract class Task { abstract set completed(value: boolean); }'),
		typescript('function isCompleted(): boolean {}'),
		typescript('const isCompleted = (): boolean => true;'),
		typescript('const isCompleted: () => boolean = getCompleted;'),
		typescript('async function isReady(): Promise<boolean> {}'),
		typescript('const isReady = async (): Promise<boolean> => true;'),
		typescript([
			'function isReady(): Promise<boolean>;',
			'async function isReady() {',
			'\treturn true;',
			'}',
		].join('\n')),
		typescript('const isReady: unknown = value;'),
		typescript('const isReady: any = value;'),
		typescript('function run<T>(isReady: T) { return isReady; }'),
		typeAware('declare const value: unknown; const isReady = value;'),
		typeAware('declare const value: any; const isReady = value;'),
		typeAware('function run<T>(value: T) { const isReady = value; return isReady; }'),
		typeAware('function run<T extends unknown>(value: T) { const isReady = value; return isReady; }'),
		typeAware('function run<T extends any>(value: T) { const isReady = value; return isReady; }'),
		typeAware('function run<T extends boolean>(value: T) { const isReady = value; return isReady; }'),
		typeAware('function run<T extends boolean | undefined>(value: T) { const isReady = value; return isReady; }'),
		typeAware([
			'const isInsideSale = async (salesRep: string | null) => {',
			'\tif (salesRep) {',
			'\t\treturn false;',
			'\t}',
			'\treturn true;',
			'};',
		].join('\n')),
		typescript([
			'const isInsideSale = async (salesRep: string | null) => {',
			'\tif (salesRep) {',
			'\t\treturn false;',
			'\t}',
			'\treturn true;',
			'};',
		].join('\n')),
		typeAware('async function isReady(): Promise<boolean> {}'),
		typeAware([
			'function isReady(): Promise<boolean>;',
			'async function isReady() {',
			'\treturn true;',
			'}',
		].join('\n')),
		typescript('type Predicate = () => boolean; const isCompleted: Predicate = getCompleted;'),
		typescript('interface Predicate { (): boolean; } const isCompleted: Predicate = getCompleted;'),
		typescript('interface Predicate { (): boolean; readonly description: string; } const isCompleted: Predicate = getCompleted;'),
		typescript('declare const getReady: () => Promise<() => boolean>; const completed = getReady;'),
		typescript('type Predicate = () => Promise<() => boolean>; declare const getReady: Predicate; const completed = getReady;'),
		typescript('interface Predicate { (): Promise<() => boolean>; } declare const getReady: Predicate; const completed = getReady;'),
		typescript('interface Empty {} const isReady: Empty = value;'),
		typeAware('interface Empty {} declare const value: Empty; const isReady: Empty = value;'),
		typescript('type Empty = {}; const isReady: Empty = value;'),
		typeAware('type Empty = {}; declare const value: Empty; const isReady: Empty = value;'),
		typescript('type Predicate = {(): boolean}; const isReady: Predicate = getReady;'),
		typescript('type ReturnValue = boolean; interface Predicate { (): ReturnValue; } { type ReturnValue = string; const isReady: Predicate = getReady; }'),
		typescript('type ReturnValue = boolean; type Predicate = {(): ReturnValue}; { type ReturnValue = string; const isReady: Predicate = getReady; }'),
		typescript('type Alias = boolean; type Value = Alias; { type Alias = string; const isReady: Value = true; }'),
		typescript('declare function completed();'),
		typescript('const completed = value as () => boolean;'),
		typescript('function completed(): boolean; function completed(value: string): string; function completed(value?: string) { return value ?? true; }'),
		typescript('function completed(): () => boolean { return () => true; }'),
		typescript('type Predicate = () => boolean; function completed(): Predicate { return getReady; }'),
		typeAware('function* completed(): Generator<boolean> { yield true; }'),
		typescript('function assertString(value: unknown): asserts value is string {} const completed = assertString(value);'),
		typescript('function assertString(value: unknown): asserts value {} const completed = assertString(value);'),
		typescript('type BooleanAlias = boolean; namespace Foo { export type BooleanAlias = string; } const completed: Foo.BooleanAlias = "x";'),
		typescript('namespace Foo { export type BooleanAlias = boolean; } const completed: Foo.BooleanAlias = true;'),
		typescript('type BooleanAlias = BooleanAlias; const completed: BooleanAlias = true;'),
		typescript('const isCompleted: boolean | undefined = true;'),
		typeAware('declare const options: {enabled: string}; const completed = options.enabled;'),
		typeAware('type BooleanAlias = boolean; declare const isEnabled: BooleanAlias; const isCompleted = isEnabled;'),
		// Destructured bindings are intentionally not checked, even with type information.
		typeAware('declare const options: {strict: boolean}; const {strict} = options;'),
		typeAware('declare const options: {strict: boolean}; const {strict: renamed} = options;'),
		typeAware('declare const options: {strict?: boolean}; const {strict = true} = options;'),
		typeAware('declare const values: [boolean]; const [enabled] = values;'),
		typeAware('declare const o: {a: {b: boolean}}; const {a: {b}} = o;'),
		typeAware('declare const options: {isReady?: string}; const {isReady = "yes"} = options;'),
		typeAware('declare const values: string[]; const [isReady = "yes"] = values;'),
		// Destructured parameters are likewise not checked.
		typeAware('function foo({strict}: {strict: boolean}) {}'),
		typeAware('interface Options {isX?: boolean} const test = ({isX}: Options = {}) => isX;'),
		typeAware('function foo({strict}: {strict?: boolean} = {}) {}'),
		typeAware('function foo({isReady = "yes"}: {isReady?: string} = {}) {}'),
		typeAware('function foo([isReady = "yes"]: [string?] = []) {}'),
		typeAware('function foo({isReady: renamed = "yes"} = {}) {}'),
		typeAware('function foo({nested: {isReady = "yes"}} = {nested: {}}) {}'),
		typeAware('function foo({...isReady}: Record<string, string> = {}) {}'),
		typeAware('function foo([first, ...isReady]: string[] = []) {}'),
	],
	invalid: [
		typescript('const completed: boolean = true;'),
		typescript('declare const completed: boolean;'),
		typescript('declare global { const completed: boolean; }'),
		typescript('const completed: true = true;'),
		typescript('const completed: true | false = true;'),
		typescript('type BooleanAlias = boolean; const completed: BooleanAlias = true;'),
		typescript('const completed = value as boolean;'),
		// Double assertion ending in `as boolean`
		typescript('const completed = value as unknown as boolean;'),
		typescript('const completed = <boolean>value;'),
		typescript('const completed = value satisfies boolean;'),
		typescript('const isReady: boolean = true; const completed = isReady!;'),
		typescript('function check(value: unknown): value is string { return typeof value === "string"; } const completed = check(value);'),
		typescript('function download(showProgress: boolean) {}'),
		// Optional boolean parameter (`?:`)
		typescript('function download(completed?: boolean) {}'),
		typescript('function download(showProgress = false) {}'),
		typescript('class Task { constructor(readonly completed = false) {} }'),
		typescript('class Task { constructor(public completed = value === true) {} }'),
		typescript('class Task { constructor(public completed: boolean) {} }'),
		typescript('function completed(): boolean {}'),
		typescript('declare function completed(): boolean;'),
		typescript('function completed(): boolean; function completed() { return true; }'),
		typescript('function completed(): boolean; function completed(value: unknown): boolean; function completed(value?: unknown) { if (value) { return true; } return false; }'),
		typescript('function isPredicate(): boolean; function isPredicate() { return true; } const completed = isPredicate();'),
		typescript([
			'function isPredicate(): boolean;',
			'function isPredicate(value: unknown): boolean;',
			'function isPredicate(value?: unknown) {',
			'\tif (value) {',
			'\t\treturn true;',
			'\t}',
			'\treturn false;',
			'}',
			'const completed = isPredicate();',
		].join('\n')),
		typescript('const completed = (): boolean => true;'),
		typescript('const completed: () => boolean = getCompleted;'),
		typescript('declare const isPredicate: () => boolean; const completed = isPredicate;'),
		typescript('type Predicate = () => boolean; const completed: Predicate = getCompleted;'),
		typescript('type Predicate = {(): boolean}; const completed: Predicate = getCompleted;'),
		typescript('interface Predicate { (): boolean; } const completed: Predicate = getCompleted;'),
		typescript('interface Predicate { (): boolean; readonly description: string; } const completed: Predicate = getCompleted;'),
		typescript('type Alias = boolean; type Value = Alias; { type Alias = string; const completed: Value = true; }'),
		typescript('type ReturnValue = boolean; interface Predicate { (): ReturnValue; } { type ReturnValue = string; const completed: Predicate = getCompleted; }'),
		typescript('type ReturnValue = boolean; type Predicate = {(): ReturnValue}; { type ReturnValue = string; const completed: Predicate = getCompleted; }'),
		typescript('function hasTitle(): string | false {}'),
		typescript('const isReady: () => () => boolean = getReady;'),
		typescript('function isReady(): () => boolean { return () => true; }'),
		typescript('type Predicate = () => boolean; function isReady(): Predicate { return getReady; }'),
		typescript('type Predicate = () => () => boolean; const isReady: Predicate = getReady;'),
		typescript('const isReady: string = "yes";'),
		typescript('const isReady: () => string = getReady;'),
		typescript('const isReady = true as string;'),
		typescript('const isReady = (value === true) as string;'),
		typescript('const isReady = value as Promise<boolean>;'),
		typescript('const isReady = value satisfies Promise<boolean>;'),
		typescript('const isReady = (): string => true as string;'),
		typescript('interface Predicate { (): string; } const isReady: Predicate = getReady;'),
		typescript('interface Options {value: string} const isReady: Options = value;'),
		typescript('type Predicate = {(): string}; const isReady: Predicate = getReady;'),
		typescript('type Options = {value: string}; const isReady: Options = value;'),
		typeAware('interface Options {value: string} declare const value: Options; const isReady = value;'),
		typeAware('type Options = {value: string}; declare const value: Options; const isReady = value;'),
		typescript('type Alias = string; type Value = Alias; { type Alias = boolean; const isReady: Value = "yes"; }'),
		typescript('type ReturnValue = string; interface Predicate { (): ReturnValue; } { type ReturnValue = boolean; const isReady: Predicate = getReady; }'),
		typescript('type ReturnValue = string; type Predicate = {(): ReturnValue}; { type ReturnValue = boolean; const isReady: Predicate = getReady; }'),
		typescript('async function isReady(): Promise<string> {}'),
		typescript('const isReady = async (): Promise<string> => "yes";'),
		typescript('async function isReady(): Promise<() => boolean> { return () => true; }'),
		typescript('const isReady = async (): Promise<() => boolean> => () => true;'),
		typescript([
			'function isReady(): Promise<() => boolean>;',
			'async function isReady() {',
			'\treturn () => true;',
			'}',
		].join('\n')),
		typeAware('async function isReady(): Promise<string> {}'),
		typeAware('const isReady = async (): Promise<string> => "yes";'),
		typeAware('async function isReady(): Promise<() => boolean> { return () => true; }'),
		typeAware('const isReady = async (): Promise<() => boolean> => () => true;'),
		typeAware([
			'function isReady(): Promise<string>;',
			'async function isReady() {',
			'\treturn "yes";',
			'}',
		].join('\n')),
		typeAware([
			'function isReady(): Promise<() => boolean>;',
			'async function isReady() {',
			'\treturn () => true;',
			'}',
		].join('\n')),
		typeAware('function* isReady(): Generator<boolean> { yield true; }'),
		typeAware([
			'function isReady(): AsyncGenerator<boolean>;',
			'async function* isReady() {',
			'\tyield true;',
			'}',
		].join('\n')),
		typescript('const isReady: Promise<boolean> = value;'),
		typescript('const isReady: PromiseLike<boolean> = value;'),
		typescript('const isReady: Promise<boolean> | undefined = value;'),
		typescript('type ReadyPromise = Promise<boolean>; const isReady: ReadyPromise = value;'),
		typescript('declare const isReady: Promise<boolean>;'),
		typescript('function foo(isReady: Promise<boolean> | undefined) {}'),
		typeAware('declare const value: Promise<boolean>; const isReady = value;'),
		typeAware('declare const getReady: () => () => boolean; const isReady = getReady;'),
		typeAware('function run<T extends string>(value: T) { const isReady = value; return isReady; }'),
		typeAware('function run<T extends boolean>(value: T) { const completed = value; return completed; }'),
		typeAware('declare const options: {enabled: string}; const isCompleted = options.enabled;'),
		typeAware('const isReady = true as string;'),
		typeAware('function hasTitle(): string | false {}'),
		typeAware('declare const options: {enabled: boolean}; const completed = options.enabled;'),
		typeAware('type BooleanAlias = boolean; declare const isEnabled: BooleanAlias; const completed = isEnabled;'),
		typescript([
			'function download(showProgress: boolean) {',
			'\tconsole.log(showProgress);',
			'}',
		].join('\n')),
		'let completed = true; completed &&= false;',
		'let isReady = true; isReady++;',
		'let isReady = true; isReady += false;',
		'let isReady = true; isReady &&= "yes";',
		'let isReady = true; for (isReady in {value: true}) {}',
	].map(testCase => typeof testCase === 'string' ? typescript(testCase) : testCase),
});

ruleTest({
	valid: [],
	invalid: [
		invalidBooleanPrefix('declare const Vue: {ref<T>(value: T): {value: T}}; const {ref} = Vue; const isReady = ref(false);'),
		invalidBooleanPrefix('declare const Vue: {ref<T>(value: T): {value: T}}; const ref = Vue.ref; const isReady = ref(false);'),
		invalidBooleanPrefix('declare const Vue: {computed<T>(getter: () => T): {value: T}}; const computed = Vue.computed; const hasReady = computed(() => true);'),
		invalidBooleanPrefix('declare module "other" { export function ref<T>(value: T): {value: T}; } import {ref} from "other"; const isReady: {value: string} = ref(false);'),
		invalidBooleanPrefix('declare module "vue" { export function computed<T>(getter: () => T): {value: T}; } import {computed as ref} from "vue"; const isReady: {value: string} = ref(false);'),
		invalidBooleanPrefix([
			'declare module "vue" { function ref<T>(value: T): {value: T}; export = ref; }',
			'import ref = require("vue");',
			'const isReady: {value: string} = ref(false);',
		].join('\n')),
		invalidBooleanPrefix([
			'declare module "vue" { export function ref<T>(value: T): {value: T}; }',
			'import {ref} from "vue";',
			'let isReady: {value: boolean} = ref(false); isReady = ref(true);',
		].join('\n')),
		invalidBooleanPrefix([
			'declare module "vue" { export function ref<T>(value: T): {value: T}; export function computed<T>(getter: () => T): {value: T}; }',
			'import {ref, computed} from "vue";',
			'const isReady: {value: string} = ref("value"); const hasReady: {value: string} = computed(() => "value");',
		].join('\n'), 2),
		typescript({code: 'for (const isReady in {value: true}) {}', errors: [{messageId: 'non-boolean-prefix'}]}),
	],
});

ruleTest.snapshot({
	valid: [
		'const task = {completed: true};',
		'class Task { completed = true; }',
		{
			code: 'const task = {isCompleted: true}; class Task { hasCompleted = true; canComplete() { return true; }}',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'interface Task { isCompleted: boolean; canComplete(): boolean; get hasCompleted(): boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { isComplete: string; }',
			options: [{checkMethods: 'never', checkFields: 'never'}],
		}),
		typescript({
			code: 'interface Task { completed(): () => boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { isCompleted: boolean; canComplete(): boolean { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'const isCompleted = true; const task = {isCompleted};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {completed: value};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {[completed]: true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const key = "isCompleted"; const task = {[key]: true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {set completed(value) { return true; }};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'class Task { *ready() { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const isPredicate = () => true; const task = {isCompleted: isPredicate};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'class Task { set completed(value) { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'class Task { #isCompleted = true; get #isReady() { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {isReady: value};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {completed: async () => value};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'class Task { async completed() { return value; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typeAware({
			code: 'declare const value: unknown; const task = {isReady: value};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'const task = {needsUpdate: true};',
			options: [{
				checkMethods: 'always', checkFields: 'always',
				prefixes: {needs: true},
			}],
		},
		typescript('interface Task { completed: boolean; }'),
		typescript({
			code: 'interface Task { completed: boolean | undefined; }',
			options: [{checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { completed(): boolean | undefined; }',
			options: [{checkMethods: 'always'}],
		}),
		typescript({
			code: 'interface Task { completed(): Promise<boolean> | undefined; }',
			options: [{checkMethods: 'always'}],
		}),
	],
	invalid: [
		{
			code: 'const task = {completed: true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {isReady: "yes"};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'const task = {isReady: true as string};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { isReady: string = "yes"; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { isReady: Promise<boolean>; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { isReady: PromiseLike<boolean>; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { isReady: Promise<boolean> | undefined; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'abstract class Task { abstract isReady: Promise<boolean>; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'class Task { isReady() {} }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'class Task { isReady() { return () => true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const isPredicate = () => true; class Task { isReady() { return isPredicate; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'interface Task { isReady(): () => boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'type Predicate = () => boolean; interface Task { isReady(): Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Predicate { (): boolean; } interface Task { isReady(): Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { isReady: () => () => boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { isReady: Promise<boolean>; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { isReady: PromiseLike<boolean>; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { isReady: Promise<boolean> | null; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { isComplete: string; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Predicate { (): string; } interface Task { isReady: Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'const task = {"completed": true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {["completed"]: true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const key = "completed"; const task = {[key]: true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {completed: progress === 100};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const isReady = true; const task = {completed: isReady};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {completed() { return true; }};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {completed: () => true};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const isPredicate = () => true; const task = {completed: isPredicate};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'const isPredicate: () => boolean = external; const task = {completed: isPredicate};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'const task = {get completed() { return true; }};',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const task = {didUpdate: true};',
			options: [{
				checkMethods: 'always', checkFields: 'always',
				prefixes: {did: false},
			}],
		},
		{
			code: 'class Task { completed = true; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'class Task { completed: boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'class Task { completed = () => true; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		{
			code: 'const isPredicate = () => true; class Task { completed = isPredicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'type Predicate = () => boolean; const isPredicate: Predicate = external; class Task { completed = isPredicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Predicate { (): boolean; } const isPredicate: Predicate = external; class Task { completed = isPredicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { completed: () => boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { accessor completed: boolean = true; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'abstract class Task { abstract completed: boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'abstract class Task { abstract completed: () => boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'abstract class Task { abstract accessor completed: boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'class Task { completed() { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'abstract class Task { abstract completed(): boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		{
			code: 'class Task { get completed() { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		},
		typescript({
			code: 'class Task { #completed: boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { get #ready(): boolean { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { #completed(): boolean { return true; } }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'class Task { accessor #completed: boolean = true; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { completed: boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { "completed": boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'type Task = { completed: boolean; };',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'type Task = { completed(): boolean; };',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { completed: () => boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Predicate { (): boolean; } interface Task { completed: Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Predicate { (): boolean; readonly description: string; } interface Task { completed: Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'type Predicate = () => boolean; interface Task { completed: Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'type Predicate = {(): boolean}; interface Task { completed: Predicate; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { completed(): boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { get completed(): boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
		typescript({
			code: 'interface Task { "completed"(): boolean; }',
			options: [{checkMethods: 'always', checkFields: 'always'}],
		}),
	],
});

ruleTest({
	valid: [
		{
			name: 'variables never',
			code: 'const completed = true;',
			options: [{checkVariables: 'never'}],
		},
		typescript({code: 'const isReady = "yes";', options: [{checkVariables: 'never'}]}),
		{
			name: 'variables prohibit boolean',
			code: 'const completed = true;',
			options: [{checkVariables: 'prohibit'}],
		},
		{
			name: 'arguments never',
			code: 'function download(showProgress = false) {}',
			options: [{checkArguments: 'never'}],
		},
		typescript({code: 'function download(isReady = "yes") {}', options: [{checkArguments: 'never'}]}),
		typescript({code: 'function isReady() { return "yes"; }', options: [{checkFunctions: 'never'}]}),
		{
			name: 'functions prohibit boolean',
			code: 'function completed() { return true; }',
			options: [{checkFunctions: 'prohibit'}],
		},
		{
			name: 'fields and methods never',
			code: 'class Task { completed = true; hasTitle() { return "Unicorn"; } }',
			options: [{checkFields: 'never', checkMethods: 'never'}],
		},
		typescript({code: 'function download(completed: (() => Promise<boolean>) | undefined) {}', options: [{checkArguments: 'always'}]}),
		typescript({
			name: 'nullable generic aliases remain unknown',
			code: 'type Maybe<T> = T | undefined; const completed: Maybe<boolean> = true;',
		}),
		typescript({
			name: 'conditional generic aliases remain unknown without type information',
			code: 'type Result<T> = T extends string ? string : boolean; declare const isReady: Result<boolean>;',
		}),
		typeAware({
			name: 'type-aware conditional generic aliases preserve boolean prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; declare const isReady: Result<boolean>;',
		}),
		typeAware({
			name: 'type-aware conditional generic aliases with nullable results remain unknown',
			code: 'type Result<T> = T extends string ? boolean | undefined : boolean | undefined; declare const completed: Result<boolean>;',
		}),
		typeAware({
			name: 'nullable async results remain unknown',
			code: 'async function completed(): Promise<boolean | undefined> {}',
		}),
		typeAware({
			name: 'nullable async function type results remain unknown',
			code: 'declare const completed: () => Promise<boolean | undefined>;',
		}),
		typeAware({
			name: 'nullable async function types remain unknown',
			code: 'declare const completed: (() => Promise<boolean>) | undefined;',
		}),
		typeAware({
			name: 'unresolved generic callable interfaces remain unknown',
			code: [
				'type Result<T> = T extends string ? string : boolean;',
				'interface Predicate<T> { (): Result<T>; }',
				'function run<T>(value: T) {',
				'\tconst isReady: Predicate<T> = value as Predicate<T>;',
				'}',
			].join(' '),
		}),
		typeAware('type Maybe<T> = T | undefined; const completed: Maybe<boolean> = true;'),
		typescript({
			name: 'recursive generic aliases do not crash',
			code: 'type Recursive<T> = Recursive<T>; declare const completed: Recursive<boolean>;',
		}),
		typescript({
			name: 'mutually recursive generic aliases do not crash',
			code: 'type First<T> = Second<T>; type Second<T> = First<T>; declare const completed: First<boolean>;',
		}),
		typescript({
			name: 'recursive aliases with omitted type arguments do not crash',
			code: 'type Box<T> = T; type Pair<T, U> = T | U; type Outer<T, U> = Pair<Box<U>, Box<T>>; declare const completed: Outer;',
		}),
		typescript({code: 'class Task { constructor(public completed: boolean) {} }', options: [{checkArguments: 'never', checkFields: 'never'}]}),
		{
			name: 'fields and methods prohibit boolean',
			code: 'class Task { completed = true; title() { return "Unicorn"; } }',
			options: [{checkFields: 'prohibit', checkMethods: 'prohibit'}],
		},
	],
	invalid: [
		{
			name: 'variables always',
			code: 'const completed = true;',
			output: 'const isCompleted = true;',
			options: [{checkVariables: 'always'}],
			errors: 1,
		},
		{
			name: 'variables prohibit non-boolean',
			code: 'const hasName = "Sindre";',
			options: [{checkVariables: 'prohibit'}],
			errors: 1,
		},
		{
			name: 'arguments always',
			code: 'function download(showProgress = false) {}',
			options: [{checkArguments: 'always'}],
			errors: 1,
		},
		{
			name: 'arguments prohibit non-boolean',
			code: 'function download(isReady = "yes") {}',
			options: [{checkArguments: 'prohibit'}],
			errors: 1,
		},
		{
			name: 'functions prohibit non-boolean',
			code: 'function hasTitle() { return "Unicorn"; }',
			options: [{checkFunctions: 'prohibit'}],
			errors: 1,
		},
		typescript({
			name: 'async functions returning booleans require prefixes',
			code: 'async function completed(): Promise<boolean> {}',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async arrow functions resolve Promise aliases',
			code: 'type Result = Promise<boolean>; const completed = async (): Result => true;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async functions resolve non-boolean Promise aliases',
			code: [
				'type Result = Promise<string>;',
				'declare const isCondition: boolean;',
				'async function isReady(): Result {',
				'	if (isCondition) {',
				'		return "no";',
				'	}',
				'	return "yes";',
				'}',
			].join('\n'),
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'async functions resolve boolean Promise aliases',
			code: [
				'type Result = Promise<boolean>;',
				'declare const isCondition: boolean;',
				'async function completed(): Result {',
				'	if (isCondition) {',
				'		return false;',
				'	}',
				'	return true;',
				'}',
			].join('\n'),
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async function references returning booleans require prefixes',
			code: 'async function isReady(): Promise<boolean> {} const completed = isReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async function variable references returning booleans require prefixes',
			code: 'const isReady = async (): Promise<boolean> => true; const completed = isReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async function type annotations reject non-booleans',
			code: 'declare const isReady: () => Promise<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'generic async Promise aliases require prefixes',
			code: 'type Result<T> = Promise<T>; async function completed(): Result<boolean> {}',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'generic async Promise aliases reject misleading prefixes',
			code: 'type Result<T> = Promise<T>; async function isReady(): Result<string> {}',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'generic async PromiseLike aliases require prefixes',
			code: 'type Result<T> = PromiseLike<T>; async function completed(): Result<boolean> {}',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'nested generic async Promise aliases require prefixes',
			code: 'type Result<T> = Promise<T>; type Outer<T> = Result<T>; async function completed(): Outer<boolean> {}',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'nested generic callable aliases require prefixes',
			code: 'interface Inner<T> { (): Promise<T>; } type Outer<T> = Inner<T>; const completed: Outer<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'generic async function aliases require prefixes',
			code: 'type Predicate<T> = () => Promise<T>; const completed: Predicate<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'generic async callable interfaces require prefixes',
			code: 'interface Predicate<T> { (): Promise<T>; } const completed: Predicate<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typeAware({
			name: 'type-aware generic callable interfaces resolve conditional aliases',
			code: [
				'type Result<T> = T extends string ? string : boolean;',
				'interface Predicate<T> { (): Result<T>; }',
				'declare const completed: Predicate<boolean>;',
				'declare const isReady: Predicate<string>;',
			].join(' '),
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware generic async callable interfaces resolve conditional aliases',
			code: [
				'type Result<T> = T extends string ? Promise<string> : Promise<boolean>;',
				'interface Predicate<T> { (): Result<T>; }',
				'declare const completed: Predicate<boolean>;',
				'declare const isReady: Predicate<string>;',
			].join(' '),
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware generic callable interface overloads combine return types',
			code: [
				'type Result<T> = T extends string ? Promise<string> : Promise<boolean>;',
				'interface Predicate<T> { (): Result<T>; (value: number): Promise<string>; }',
				'declare const isReady: Predicate<boolean>;',
			].join(' '),
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware generic callable interfaces keep nullable Promise booleans unknown',
			code: [
				'type Result<T> = T extends string ? Promise<boolean> | undefined : Promise<string> | undefined;',
				'interface Predicate<T> { (): Result<T>; }',
				'declare const completed: Predicate<string>;',
				'declare const isReady: Predicate<boolean>;',
			].join(' '),
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware generic PromiseLike callable interfaces resolve conditional aliases',
			code: [
				'type Result<T> = T extends string ? PromiseLike<string> : PromiseLike<boolean>;',
				'interface Predicate<T> { (): Result<T>; }',
				'declare const completed: Predicate<boolean>;',
				'declare const isReady: Predicate<string>;',
			].join(' '),
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware generic callable interfaces keep nullable PromiseLike booleans unknown',
			code: [
				'type Result<T> = T extends string ? PromiseLike<boolean> | undefined : PromiseLike<string> | undefined;',
				'interface Predicate<T> { (): Result<T>; }',
				'declare const completed: Predicate<string>;',
				'declare const isReady: Predicate<boolean>;',
			].join(' '),
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'generic synchronous function aliases require prefixes',
			code: 'type Predicate<T> = () => T; const completed: Predicate<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'generic synchronous callable interfaces require prefixes',
			code: 'interface Predicate<T> { (): T; } const completed: Predicate<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'inherited generic callable interfaces require prefixes',
			code: 'interface Base<T> { (): T; } interface Predicate<T> extends Base<T> {} const completed: Predicate<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'inherited generic async callable interfaces require prefixes',
			code: 'interface Base<T> { (): Promise<T>; } interface Predicate<T> extends Base<T> {} const completed: Predicate<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'inherited generic async callable interfaces reject misleading prefixes',
			code: 'interface Base<T> { (): Promise<T>; } interface Predicate<T> extends Base<T> {} declare const isReady: Predicate<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'nested generic inherited callable interfaces require prefixes',
			code: 'type Box<T> = T; interface Base<T> { (): T; } interface Predicate<T> extends Base<Box<T>> {} declare const completed: Predicate<boolean>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'nested generic inherited callable interfaces reject misleading prefixes',
			code: 'type Box<T> = T; interface Base<T> { (): T; } interface Predicate<T> extends Base<Box<T>> {} declare const isReady: Predicate<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'nested generic inherited callable interfaces resolve unions',
			code: [
				'type Box<T> = T;',
				'interface Base<T> { (): T; }',
				'interface Predicate<T> extends Base<Box<T> | false> {}',
				'declare const completed: Predicate<boolean>; declare const isReady: Predicate<string>;',
			].join(' '),
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'nested generic inherited async callable interfaces require prefixes',
			code: 'type Box<T> = T; interface Base<T> { (): Promise<T>; } interface Predicate<T> extends Base<Box<T>> {} declare const completed: Predicate<boolean>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'nested generic inherited async callable interfaces reject misleading prefixes',
			code: 'type Box<T> = T; interface Base<T> { (): Promise<T>; } interface Predicate<T> extends Base<Box<T>> {} declare const isReady: Predicate<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'deeply nested generic aliases require prefixes',
			code: 'type Identity<T> = T; type Compose<T> = Identity<T>; type Outer<T> = Compose<Identity<T>>; declare const completed: Outer<boolean>; declare const isReady: Outer<string>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'deeply nested generic async aliases require prefixes',
			code: [
				'type Identity<T> = T;',
				'type Result<T> = Promise<Identity<T>>;',
				'async function completed(): Result<boolean> {}',
				'async function isReady(): Result<string> {}',
			].join(' '),
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}, {messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'nested generic defaults use inner type arguments',
			code: 'type Inner<T, U = T> = U; type Outer<T> = Inner<string>; declare const isReady: Outer<boolean>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'generic value aliases require prefixes',
			code: 'type Value<T> = T; declare const completed: Value<boolean>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typeAware({
			name: 'type-aware generic value aliases require prefixes',
			code: 'type Value<T> = T; declare const completed: Value<boolean>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'default generic value aliases require prefixes',
			code: 'type Value<T = boolean> = T; declare const completed: Value;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'generic value aliases reject misleading prefixes',
			code: 'type Value<T> = T; declare const isReady: Value<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware conditional generic aliases require prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; declare const value: Result<boolean>; const completed = value;',
			output: 'type Result<T> = T extends string ? string : boolean; declare const value: Result<boolean>; const isCompleted = value;',
			errors: [
				{messageId: 'consistent-boolean-name', suggestions: 11},
				{messageId: 'consistent-boolean-name', suggestions: 11},
			],
		}),
		typeAware({
			name: 'type-aware conditional generic aliases reject misleading prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; declare const isReady: Result<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typeAware({
			name: 'type-aware conditional generic aliases require direct variable prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; declare const completed: Result<boolean>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typeAware({
			name: 'type-aware nested conditional generic aliases require prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; type Outer<T> = Result<T>; declare const completed: Outer<boolean>;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typeAware({
			name: 'type-aware conditional generic aliases require field prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; interface Task { completed: Result<boolean>; }',
			options: [{checkFields: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typeAware({
			name: 'type-aware conditional generic aliases require method prefixes',
			code: 'type Result<T> = T extends string ? string : boolean; interface Task { completed(): Result<boolean>; }',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typeAware({
			name: 'type-aware conditional generic Promise aliases require method prefixes',
			code: 'type Result<T> = T extends string ? Promise<string> : Promise<boolean>; interface Task { completed(): Result<boolean>; }',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typeAware({
			name: 'type-aware conditional generic PromiseLike aliases require method prefixes',
			code: 'type Result<T> = T extends string ? PromiseLike<string> : PromiseLike<boolean>; interface Task { completed(): Result<boolean>; }',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'generic callable aliases reject misleading prefixes',
			code: 'type Predicate<T> = () => T; declare const isReady: Predicate<string>;',
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'generic aliases inside unions require prefixes',
			code: 'type Value<T> = T; declare const completed: Value<boolean> | false;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'non-generic aliases wrapping generic aliases require prefixes',
			code: 'type Value<T> = T; type BooleanValue = Value<boolean>; declare const completed: BooleanValue;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'generic fields require prefixes',
			code: 'type Value<T> = T; interface Task { completed: Value<boolean>; }',
			options: [{checkFields: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'generic callable fields require prefixes',
			code: 'type Predicate<T> = () => T; interface Task { completed: Predicate<boolean>; }',
			options: [{checkFields: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'generic class methods require prefixes',
			code: 'type Value<T> = T; class Task { completed(): Value<boolean> {} }',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'generic method signatures require prefixes',
			code: 'type Value<T> = T; interface Task { completed(): Value<boolean>; }',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'generic function return types require prefixes',
			code: 'type Value<T> = T; function completed(): Value<boolean> { return true; }',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async function type references returning booleans require prefixes',
			code: 'declare const isReady: () => Promise<boolean>; const completed = isReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async aliased function type references returning booleans require prefixes',
			code: 'type Predicate = () => Promise<boolean>; declare const isReady: Predicate; const completed = isReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async callable interface references returning booleans require prefixes',
			code: 'interface Predicate { (): Promise<boolean>; } declare const isReady: Predicate; const completed = isReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async function type annotations returning booleans require prefixes',
			code: 'const completed: () => Promise<boolean> = getReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async field function type annotations returning booleans require prefixes',
			code: 'interface Task { completed: () => Promise<boolean>; }',
			options: [{checkFields: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'async field function type annotations reject non-booleans',
			code: 'interface Task { isReady: () => Promise<string>; }',
			options: [{checkFields: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'PromiseLike function type references returning booleans require prefixes',
			code: 'declare const isReady: () => PromiseLike<boolean>; const completed = isReady;',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		typescript({
			name: 'async overloads returning booleans require prefixes',
			code: 'function completed(): Promise<boolean>; async function completed() {}',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 11}],
		}),
		{
			name: 'unspecified options keep their defaults',
			code: 'function download(showProgress = false) {}',
			options: [{checkVariables: 'never'}],
			errors: 1,
		},
		{
			name: 'fields and methods prohibit non-boolean',
			code: 'class Task { isReady = "yes"; hasTitle() { return "Unicorn"; } }',
			options: [{checkFields: 'prohibit', checkMethods: 'prohibit'}],
			errors: 2,
		},
		{
			name: 'fields and methods always',
			code: 'class Task { completed = true; completedMethod() { return true; } }',
			options: [{checkFields: 'always', checkMethods: 'always'}],
			errors: 2,
		},
		{
			name: 'methods are checked when fields are disabled',
			code: 'class Task { completed = true; completedMethod() { return true; } }',
			options: [{checkFields: 'never', checkMethods: 'always'}],
			errors: 1,
		},
		{
			name: 'fields are checked when methods are disabled',
			code: 'class Task { completed = true; completedMethod() { return true; } }',
			options: [{checkFields: 'always', checkMethods: 'never'}],
			errors: 1,
		},
		{
			name: 'object methods are checked when fields are disabled',
			code: 'const task = {completed() { return true; }};',
			options: [{checkFields: 'never', checkMethods: 'always'}],
			errors: 1,
		},
		{
			name: 'object fields are checked when methods are disabled',
			code: 'const task = {completed: true};',
			options: [{checkFields: 'always', checkMethods: 'never'}],
			errors: 1,
		},
		typescript({
			name: 'async methods returning booleans require prefixes',
			code: 'class Task { async completed(): Promise<boolean> {} }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'async object fields returning booleans require prefixes',
			code: 'const task = {completed: async (): Promise<boolean> => true};',
			options: [{checkFields: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'async object methods returning booleans require prefixes',
			code: 'const task = {async completed(): Promise<boolean> {}};',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'async method signatures returning booleans require prefixes',
			code: 'interface Task { completed(): Promise<boolean>; }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'nullable non-boolean async method returns are prohibited',
			code: 'interface Task { isReady(): Promise<string> | undefined; }',
			options: [{checkMethods: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'nullable non-boolean fields are prohibited',
			code: 'interface Task { isReady: string | undefined; }',
			options: [{checkFields: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'nullable non-boolean synchronous method returns are prohibited',
			code: 'interface Task { isReady(): string | undefined; }',
			options: [{checkMethods: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'mixed Promise and non-boolean method returns are prohibited',
			code: 'interface Task { isReady(): Promise<boolean> | string; }',
			options: [{checkMethods: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'mixed Promise and non-boolean fields are prohibited',
			code: 'interface Task { isReady: Promise<boolean> | string; }',
			options: [{checkFields: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'constructor fields are checked independently of arguments',
			code: 'class Task { constructor(public completed: boolean) {} }',
			options: [{checkArguments: 'never', checkFields: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'constructor fields and arguments are both checked',
			code: 'class Task { constructor(public completed: boolean) {} }',
			options: [{checkArguments: 'always', checkFields: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'constructor parameter properties do not get unsafe suggestions',
			code: 'class Task { constructor(public completed: boolean = false) { this.completed = completed; } }',
			errors: [{messageId: 'consistent-boolean-name', suggestions: 0}],
		}),
		typescript({
			name: 'constructor argument prohibition',
			code: 'class Task { constructor(public isReady: string) {} }',
			options: [{checkArguments: 'prohibit', checkFields: 'never'}],
			errors: 1,
		}),
		typescript({
			name: 'constructor field prohibition',
			code: 'class Task { constructor(public isReady: string) {} }',
			options: [{checkArguments: 'never', checkFields: 'prohibit'}],
			errors: 1,
		}),
		{
			name: 'shorthand fields prohibit non-boolean prefixes',
			code: 'const isReady = "yes"; const task = {isReady};',
			options: [{checkVariables: 'never', checkFields: 'prohibit'}],
			errors: 1,
		},
		{
			name: 'shorthand fields are checked when variables are disabled',
			code: 'const completed = true; const task = {completed};',
			options: [{checkVariables: 'never', checkFields: 'always'}],
			errors: 1,
		},
		{
			name: 'shorthand variables and fields are checked independently',
			code: 'const completed = true; const task = {completed};',
			output: 'const isCompleted = true; const task = {completed: isCompleted};',
			options: [{checkVariables: 'always', checkFields: 'always'}],
			errors: 2,
		},
		{
			name: 'shorthand fields report their own non-boolean prefixes',
			code: 'const isReady = "yes"; const task = {isReady};',
			options: [{checkVariables: 'prohibit', checkFields: 'prohibit'}],
			errors: 2,
		},
	],
});

test('rejects the removed checkProperties option', t => {
	const linter = new Linter({configType: 'flat'});
	const verify = options => linter.verify('const completed = true;', {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {unicorn},
		rules: {
			'unicorn/consistent-boolean-name': ['error', options],
		},
	});

	for (const checkProperties of [false, true, 'always']) {
		t.throws(
			() => verify({checkProperties}),
			{message: /`checkProperties` was removed\. Use `checkMethods` and `checkFields` instead\./u},
		);
	}

	t.throws(() => verify({checkVariables: true}));
	t.throws(() => verify({checkMethods: 'invalid'}));
});

ruleTest({
	valid: [
		typescript({
			name: 'mixed overload return types do not require a boolean prefix',
			code: 'interface Task { completed(): boolean; completed(value: string): string; }',
			options: [{checkMethods: 'always'}],
		}),
	],
	invalid: [
		{
			name: 'static and instance methods with the same name are checked independently',
			code: 'class Task { static completed() { return true; } completed() { return true; } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		},
		{
			name: 'getter and setter pairs report the boolean getter once',
			code: 'const task = {get completed() { return true; }, set completed(value) {}};',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		},
		{
			name: 'private and public methods with the same name are checked independently',
			code: 'class Task { #completed() { return true; } completed() { return true; } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		},
		{
			name: 'equivalent public method names are deduplicated',
			code: 'class Task { completed() { return true; } \'completed\'() { return true; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		},
		typescript({
			name: 'overloaded method signatures report once',
			code: 'interface Task { completed(): boolean; completed(value: string): boolean; }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'mixed overload return types prohibit misleading prefixes',
			code: 'interface Task { isReady(): boolean; isReady(value: string): string; }',
			options: [{checkMethods: 'prohibit'}],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
		typescript({
			name: 'different method names report independently',
			code: 'interface Task { completed(): boolean; finished(): boolean; }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'overloaded method signatures with equivalent public names report once',
			code: 'interface Task { completed(): boolean; [\'completed\'](value: string): boolean; }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'overloaded class methods report once',
			code: 'class Task { completed(): boolean; completed(value: string): boolean; completed(value?: string) { return true; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'overloaded class methods use declared return types',
			code: 'class Task { completed(): boolean; completed(value: string): boolean; completed(value?: string) { if (value) { return true; } return false; } }',
			options: [{checkMethods: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}],
		}),
		typeAware({
			name: 'type-aware unannotated async function declarations require prefixes',
			code: 'async function completed() { return true; }',
			errors: 1,
		}),
		typeAware({
			name: 'type-aware unannotated async arrow functions require prefixes',
			code: 'const completed = async () => true;',
			errors: 1,
		}),
		typescript({
			name: 'merged callable interfaces are resolved together',
			code: 'interface Predicate<T> { value: string; } interface Predicate<T> { (): T; } declare const completed: Predicate<boolean>;',
			errors: 1,
		}),
		typescript({
			name: 'overloaded method signatures in merged interfaces report once',
			code: 'interface Task { completed(): boolean; } interface Task { completed(value: string): boolean; }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'overloaded method signatures in one namespace report once',
			code: 'namespace First { interface Task { completed(): boolean; } interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'different interfaces in one namespace report independently',
			code: 'namespace First { interface Task { completed(): boolean; } interface Job { completed(): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'different interfaces in one namespace report fields independently',
			code: 'namespace First { interface Task { completed: boolean; } interface Job { completed: boolean; } }',
			options: [{checkFields: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}, {messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'merged interface fields report once',
			code: 'interface Task { completed: boolean; } interface Task { completed: boolean; }',
			options: [{checkFields: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'same-name type aliases report independently',
			code: 'namespace First { type Task = { completed(): boolean; }; type Task = { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'same-name type aliases report fields independently',
			code: 'namespace First { type Task = { completed: boolean; }; type Task = { completed: boolean; }; }',
			options: [{checkFields: 'always'}],
			errors: [{messageId: 'consistent-boolean-name'}, {messageId: 'consistent-boolean-name'}],
		}),
		typescript({
			name: 'overloaded method signatures in namespace-merged interfaces report once',
			code: 'namespace First { export interface Task { completed(): boolean; } } namespace First { export interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'overloaded method signatures in dotted namespace-merged interfaces report once',
			code: 'namespace First.Inner { export interface Task { completed(): boolean; } } namespace First.Inner { export interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'non-exported interfaces in separate namespaces are checked independently',
			code: 'namespace First { interface Task { completed(): boolean; } } namespace First { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'overloaded method signatures in ambient module-merged interfaces report once',
			code: 'declare module \'first\' { interface Task { completed(): boolean; } } declare module \'first\' { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'namespace and ambient module interfaces with the same name are checked independently',
			code: 'namespace first { interface Task { completed(): boolean; } } declare module \'first\' { interface Task { completed(): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'distinct ambient module and namespace paths are checked independently',
			code: 'declare module \'first.inner\' { interface Task { completed(): boolean; } } declare module \'first\' { namespace inner { interface Task { completed(): boolean; } } }',
			options: [{checkMethods: 'always'}],
			errors: 2,
		}),
		typescript({
			name: 'global interfaces in separate ambient declarations report once',
			code: 'export {}; declare global { interface Task { completed(): boolean; } } declare global { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'interfaces in separate ambient namespaces report once',
			code: 'declare namespace First { interface Task { completed(): boolean; } } declare namespace First { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'interfaces in separate dotted ambient namespaces report once',
			code: 'declare namespace First.Inner { interface Task { completed(): boolean; } } declare namespace First.Inner { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'interfaces in regular and ambient namespace declarations report once',
			code: 'namespace First { export interface Task { completed(): boolean; } } declare namespace First { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
		typescript({
			name: 'interfaces in separate identifier-named ambient modules report once',
			code: 'declare module First { interface Task { completed(): boolean; } } declare module First { interface Task { completed(value: string): boolean; } }',
			options: [{checkMethods: 'always'}],
			errors: 1,
		}),
	],
});

// Svelte `{#each}` bindings are `Parameter` definitions whose owner is the each-block, not a function.
ruleTest.svelte({
	valid: [
		'<script>let items = [];</script>{#each items as item}{item}{/each}',
		'<script>let entries = [];</script>{#each entries as [key, value]}{key}{value}{/each}',
	],
	invalid: [],
});
