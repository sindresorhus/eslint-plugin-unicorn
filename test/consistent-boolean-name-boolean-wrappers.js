import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta, 'consistent-boolean-name');

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

const booleanWrapperOptions = {
	wrappers: {
		StorageItem: 'get',
	},
};

const storageItemType = 'interface StorageItem<Base, Return = Base | undefined> {get(): Promise<Return>; has(): Promise<boolean>}';
const storageItemClass = 'declare class StorageItem<Base, Return = Base | undefined> {constructor(key: string); get(): Promise<Return>; has(): Promise<boolean>}';
const validBooleanWrapper = (code, options = booleanWrapperOptions) => typeAware({code, options: [options]});
const invalidBooleanWrapper = (code, options = booleanWrapperOptions) => typeAware({
	code,
	options: [options],
	errors: [{messageId: 'non-boolean-prefix'}],
});

test({
	valid: [
		validBooleanWrapper(`${storageItemType} declare const isUnicorn: StorageItem<boolean>;`),
		validBooleanWrapper([
			'namespace Storage { export interface StorageItem<Return> {get(): Promise<Return>} }',
			'import StorageItem = Storage.StorageItem;',
			'declare const isUnicorn: StorageItem<boolean>;',
		].join('\n')),
		validBooleanWrapper(`${storageItemType} declare const isUnicorn: StorageItem<unknown, boolean>;`),
		validBooleanWrapper(`${storageItemType} function useStorage(isUnicorn: StorageItem<unknown, boolean>) {}`),
		validBooleanWrapper(`${storageItemType} type BooleanStorageItem = StorageItem<unknown, boolean>; declare const isUnicorn: BooleanStorageItem;`),
		validBooleanWrapper(`${storageItemType} interface ExtendedStorageItem extends StorageItem<unknown, boolean> {} declare const isUnicorn: ExtendedStorageItem;`),
		validBooleanWrapper([
			'interface StorageItem<Return = unknown> {get(): Promise<Return>}',
			'interface ExtendedStorageItem extends StorageItem {get(): Promise<boolean>}',
			'declare const isUnicorn: ExtendedStorageItem;',
		].join('\n')),
		validBooleanWrapper([
			'interface StorageItem<Return = unknown> {get(): Promise<Return>}',
			'interface ExtendedStorageItem<Return> extends StorageItem<Return> {}',
			'declare const isUnicorn: ExtendedStorageItem<boolean>;',
		].join('\n')),
		validBooleanWrapper(`${storageItemType} type IntersectedStorageItem = StorageItem<unknown, boolean> & {key: string}; declare const isUnicorn: IntersectedStorageItem;`),
		validBooleanWrapper(`${storageItemType} type ReadonlyStorageItem = Readonly<StorageItem<unknown, boolean>>; declare const isUnicorn: ReadonlyStorageItem;`),
		validBooleanWrapper(`${storageItemType} declare function createStorageItem(): StorageItem<boolean>; const isUnicorn = createStorageItem();`),
		validBooleanWrapper(`${storageItemType} function useStorage<T extends StorageItem<boolean>>(isUnicorn: T) {}`),
		validBooleanWrapper('interface BooleanWrapper {value: boolean} declare const isReady: BooleanWrapper;', {wrappers: {BooleanWrapper: 'value'}}),
		validBooleanWrapper('interface DirectBooleanMethodWrapper {get(): boolean} declare const isReady: DirectBooleanMethodWrapper;', {wrappers: {DirectBooleanMethodWrapper: 'get'}}),
		validBooleanWrapper('interface BooleanWrapper {get(): boolean} declare const ready: BooleanWrapper;', {wrappers: {BooleanWrapper: 'get'}}),
		validBooleanWrapper('interface StringMemberWrapper {\'value-state\': boolean} declare const isReady: StringMemberWrapper;', {wrappers: {StringMemberWrapper: 'value-state'}}),
		validBooleanWrapper('interface PromiseWrapper {get: Promise<boolean>} declare const isReady: PromiseWrapper;', {wrappers: {PromiseWrapper: 'get'}}),
		validBooleanWrapper('interface PromiseLikeWrapper {get(): PromiseLike<boolean>} declare const isReady: PromiseLikeWrapper;', {wrappers: {PromiseLikeWrapper: 'get'}}),
	],
	invalid: [
		invalidBooleanWrapper(`${storageItemType} declare const isUnicorn: StorageItem<unknown, string>;`),
		invalidBooleanWrapper([
			'namespace Storage { export interface StorageItem<Return> {get(): Promise<Return>} }',
			'import StorageItem = Storage.StorageItem;',
			'declare const isUnicorn: StorageItem<string>;',
		].join('\n')),
		invalidBooleanWrapper(`${storageItemType} declare const isUnicorn: StorageItem<unknown, () => boolean>;`),
		invalidBooleanWrapper(`${storageItemType} declare const isUnicorn: StorageItem<unknown, boolean> | {get(): Promise<string>};`),
		invalidBooleanWrapper(`${storageItemType} type InvalidIntersection = StorageItem<unknown, boolean> & {get(): Promise<string>}; declare const isUnicorn: InvalidIntersection;`),
		invalidBooleanWrapper(`${storageItemClass} declare class InvalidStorageItem extends StorageItem<unknown, string> {} declare const isUnicorn: InvalidStorageItem;`),
		invalidBooleanWrapper([
			'interface StorageItem {get(): Promise<boolean>}',
			'type Box<T> = {get(): Promise<boolean>};',
			'declare const isUnicorn: Box<StorageItem>;',
		].join('\n')),
		invalidBooleanWrapper([
			'interface StorageItem<Return = unknown> {get(): Promise<Return>}',
			'interface ExtendedStorageItem<Return> extends StorageItem<Return> {}',
			'declare const isUnicorn: ExtendedStorageItem<string>;',
		].join('\n')),
		invalidBooleanWrapper('interface MissingMember {value: boolean} declare const isReady: MissingMember;', {wrappers: {MissingMember: 'get'}}),
		invalidBooleanWrapper('interface StringPropertyWrapper {get: string} declare const isReady: StringPropertyWrapper;', {wrappers: {StringPropertyWrapper: 'get'}}),
		invalidBooleanWrapper([
			'interface OverloadedWrapper {',
			'\tget(): Promise<boolean>;',
			'\tget(value: string): Promise<string>;',
			'}',
			'declare const isReady: OverloadedWrapper;',
		].join('\n'), {wrappers: {OverloadedWrapper: 'get'}}),
		// Boolean wrappers intentionally apply only to variable and parameter bindings.
		invalidBooleanWrapper('interface BooleanWrapper {get(): Promise<boolean>} interface Settings {isReady: BooleanWrapper}', {checkProperties: true, wrappers: {BooleanWrapper: 'get'}}),
		invalidBooleanWrapper(`${storageItemType} let isUnicorn: StorageItem<unknown, boolean> = value; isUnicorn = value;`),
		invalidBooleanWrapper(`${storageItemType} declare const isUnicorn: StorageItem<unknown, boolean>;`, {}),
		typescript({
			code: `${storageItemType} declare const isUnicorn: StorageItem<unknown, boolean>;`,
			options: [booleanWrapperOptions],
			errors: [{messageId: 'non-boolean-prefix'}],
		}),
	],
});
