import test from 'node:test';
import {getJSDocumentBooleanState} from '../../rules/utils/get-jsdoc-boolean-state.js';
import {parseJSDocumentType} from '../../rules/utils/parse-jsdoc-type.js';

const getAnnotation = expression => ({type: parseJSDocumentType(expression)});

test('legacy nullish aliases retain relaxed naming and strict return policies', t => {
	for (const alias of ['Null', 'Undefined']) {
		const annotation = getAnnotation(`boolean | ${alias}`);
		t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'unknown', alias);
		t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true}), 'boolean', alias);
		t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation(`() => boolean | ${alias}`), {functionTypesAreBoolean: true}), 'unknown', alias);
	}

	t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation('Void')), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation('() => Void'), {functionTypesAreBoolean: true}), 'non-boolean');
});

test('parameter optionality changes certainty without changing its primitive type', t => {
	const annotation = {...getAnnotation('boolean'), optional: true};
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'unknown');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true}), 'boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'unknown');
});

test('ignoring nullish members never turns a nullish-only union into a boolean', t => {
	const annotation = getAnnotation('null | undefined');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'unknown');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true}), 'unknown');
});

test('callable classification is independent of nullish classification', t => {
	const annotation = getAnnotation('(() => boolean) | undefined');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'unknown');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'unknown');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true}), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true, functionTypesAreBoolean: true}), 'boolean');
});

test('nullable callback results require an explicit relaxed return policy', t => {
	const annotation = getAnnotation('() => boolean | null');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'unknown');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true, functionTypesAreBoolean: true}), 'boolean');
});

test('scalar and callable union members must both meet the selected value policy', t => {
	const annotation = getAnnotation('boolean | (() => boolean)');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation('boolean | (() => string)'), {functionTypesAreBoolean: true}), 'non-boolean');
});

test('a callback returning another callback does not inherit its eventual boolean result', t => {
	const annotation = getAnnotation('() => () => boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true, functionTypesAreBoolean: true}), 'non-boolean');
});

test('callable object signatures supply boolean return contracts without making their bindings boolean', t => {
	for (const expression of ['{(): boolean}', '{(value: string): boolean; label: string}', '{(value: string): boolean; (value: number): true}']) {
		const annotation = getAnnotation(expression);
		t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'non-boolean', expression);
		t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'boolean', expression);
	}

	for (const expression of ['{read(): boolean}', '{readonly(): boolean}', '{readonly read(): boolean}']) {
		t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation(expression), {functionTypesAreBoolean: true}), 'non-boolean', expression);
	}
});

test('callable object contracts preserve mixed, unknown, and higher-order overload results', t => {
	for (const [expression, expected] of [
		['{(value: string): boolean; (value: number): string}', 'non-boolean'],
		['{(): boolean; (value: string): unknown}', 'unknown'],
		['{(): () => boolean}', 'non-boolean'],
	]) {
		t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation(expression), {functionTypesAreBoolean: true}), expected, expression);
	}
});

test('callable object nullability and optionality follow the selected return policy', t => {
	for (const annotation of [
		getAnnotation('?{(): boolean}'),
		getAnnotation('({(): boolean}) | undefined'),
		getAnnotation('{(): boolean | undefined}'),
		{...getAnnotation('{(): boolean}'), optional: true},
	]) {
		t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'unknown');
		t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true, functionTypesAreBoolean: true}), 'boolean');
	}
});

test('boolean elements and fields do not make their containing value boolean', t => {
	for (const expression of ['Array<() => boolean>', '{ready: boolean}', 'readonly [() => boolean]']) {
		t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation(expression), {functionTypesAreBoolean: true}), 'non-boolean', expression);
	}
});

test('promise wrappers remain values rather than resolved boolean contracts', t => {
	for (const expression of ['Promise<boolean>', '() => Promise<boolean>', '() => PromiseLike<boolean>']) {
		t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation(expression), {allowNullish: true, functionTypesAreBoolean: true}), 'non-boolean', expression);
	}
});

test('grouped callback metadata does not hide a mixed overload return', t => {
	const annotation = getAnnotation('((() => boolean) & {label: string}) & ((() => string) & {tag: string})');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'non-boolean');
});

test('records alone remain non-boolean when all intersection members are metadata', t => {
	const annotation = getAnnotation('{first: boolean} & ({second: boolean} & {third: boolean})');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'non-boolean');
});

test('uncertain overload results dominate known boolean and non-boolean results', t => {
	const options = {functionTypesAreBoolean: true};
	for (const expression of [
		'(() => unknown) & (() => boolean) & (() => string)',
		'(() => boolean) & ((() => string) & (() => unknown))',
		'(() => string) & (() => boolean) & Unresolved',
	]) {
		t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation(expression), options), 'unknown', expression);
	}
});

test('a malformed nested callback type cannot supply a boolean contract', t => {
	const annotation = getAnnotation('(() => boolean) & ((value:) => boolean)');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {functionTypesAreBoolean: true}), 'unknown');
});

test('reusing a cached annotation cannot leak relaxed options into later checks', t => {
	const annotation = {...getAnnotation('() => boolean | undefined'), optional: true};
	const original = structuredClone(annotation);
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true, functionTypesAreBoolean: true}), 'boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation), 'unknown');
	t.assert.strictEqual(getJSDocumentBooleanState(annotation, {allowNullish: true}), 'non-boolean');
	t.assert.deepStrictEqual(annotation, original);
});

for (const [description, expression, expected] of [
	['branded primitive booleans retain their value contract', 'boolean & {brand: string}', ['boolean', 'boolean', 'boolean', 'boolean']],
	['record metadata does not resolve an unknown primitive intersection', 'boolean & Unresolved & {brand: string}', ['unknown', 'unknown', 'unknown', 'unknown']],
	['callback-valued properties do not make an ordinary record callable', '{read: () => boolean}', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['dictionary value callbacks do not make their dictionary callable', 'Object<string, () => boolean>', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['a union with ordinary record metadata is not a definite predicate', '{(): boolean} | {label: string}', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['metadata methods do not contribute overload return types', '{(): boolean} & {read(): string}', ['non-boolean', 'non-boolean', 'boolean', 'boolean']],
	['predicate results may carry branded boolean metadata', '() => (boolean & {brand: string})', ['non-boolean', 'non-boolean', 'boolean', 'boolean']],
	['nullable unknown overload results remain unknown under relaxed policies', '?({(): boolean} & {(value: string): unknown})', ['unknown', 'non-boolean', 'unknown', 'unknown']],
	['void members cannot be removed by the nullish union policy', 'boolean | void', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['unresolved never expressions are not simplified like native unions', 'boolean | never', ['unknown', 'unknown', 'unknown', 'unknown']],
	['void callback results are not nullable boolean results', '() => (boolean | void)', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['nullish uncertainty and mixed primitive evidence remain separate policies', 'boolean | number | undefined', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['nullable scalar-callable unions require every remaining member to meet the policy', '(() => boolean) | string | undefined', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['callable record metadata does not unwrap promised return values', '(() => Promise<boolean>) & {label: string}', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['nullish-only callback results never become boolean predicates', '() => (null | undefined)', ['non-boolean', 'non-boolean', 'unknown', 'unknown']],
	['nullable ordinary method records do not become nullable predicates', '?{read(): boolean}', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['optional higher-order callables retain the returned function boundary', '(function(): (() => boolean))=', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['generic argument booleans do not resolve unknown named outer types', 'Map<string, boolean>', ['unknown', 'unknown', 'unknown', 'unknown']],
	['bare Object unions retain uncertainty instead of supplying primitive facts', 'boolean | Object', ['unknown', 'unknown', 'unknown', 'unknown']],
	['nullable arrays are values even when every element is boolean', 'Array<boolean> | undefined', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['optional nonboolean primitives remain nonboolean after optionality is relaxed', 'string=', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['unsupported constructor results cannot hide inside an otherwise boolean overload', '{(): boolean; (input: string): function(new: Item): boolean}', ['unknown', 'unknown', 'unknown', 'unknown']],
	['literal-only boolean unions retain a definite scalar contract', 'true | false', ['boolean', 'boolean', 'boolean', 'boolean']],
	['qualified Boolean names are not normalized as primitive aliases', 'globalThis.Boolean', ['unknown', 'unknown', 'unknown', 'unknown']],
	['omitted callback results cannot establish predicate names', 'function()', ['non-boolean', 'non-boolean', 'unknown', 'unknown']],
	['receiver and argument booleans cannot supply a callback return contract', 'function(this: boolean, Array<boolean>): string', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['wildcard union members retain uncertainty beside a predicate', '(() => boolean) | *', ['unknown', 'unknown', 'unknown', 'unknown']],
	['literal-only callback results supply a definite predicate contract', 'function(): true | false', ['non-boolean', 'non-boolean', 'boolean', 'boolean']],
	['nullable result suffixes do not make callback bindings nullable', '() => boolean?', ['non-boolean', 'non-boolean', 'unknown', 'boolean']],
	['scalar and callable intersection members obey the callable policy', 'boolean & (() => boolean)', ['non-boolean', 'non-boolean', 'boolean', 'boolean']],
	['nullish branded primitives preserve the relaxed scalar policy', '(boolean | undefined) & {brand: string}', ['unknown', 'boolean', 'unknown', 'boolean']],
	['nullable metadata is not discarded as a definite record brand', 'boolean & (?{brand: string})', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['empty record intersections retain uncertainty beside callbacks', '(() => boolean) & {}', ['unknown', 'unknown', 'unknown', 'unknown']],
	['branded nullable callback results preserve strict return uncertainty', '{(): (boolean | undefined) & {brand: string}}', ['non-boolean', 'non-boolean', 'unknown', 'boolean']],
	['void overloads remain nonboolean under relaxed nullish policies', '{(): boolean; (): void}', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['nullish-only overloads cannot be removed as nullable union members', '{(): boolean; (): null}', ['non-boolean', 'non-boolean', 'unknown', 'unknown']],
	['higher-order overloads cannot borrow another overload boolean result', '{(): boolean; (): () => boolean}', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['record brands do not resolve unknown results in callable unions', '({(): boolean} | {(): unknown}) & {label: string}', ['non-boolean', 'non-boolean', 'unknown', 'unknown']],
	['record brands do not resolve mixed primitive unions', '(boolean | string) & {brand: string}', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
	['nullish policy reaches nested scalar unions', 'boolean | (number | undefined)', ['unknown', 'non-boolean', 'unknown', 'non-boolean']],
	['nullable bindings and nullable results each obey the selected policy', '(() => (boolean | undefined)) | undefined', ['unknown', 'non-boolean', 'unknown', 'boolean']],
	['nullable higher-order results retain the single-call boundary', '() => (() => boolean) | undefined', ['non-boolean', 'non-boolean', 'unknown', 'non-boolean']],
	['nullable array results remain nonboolean when element booleans are definite', '() => (Array<boolean> | undefined)', ['non-boolean', 'non-boolean', 'unknown', 'non-boolean']],
	['nullable unresolved results stay unknown after dropping nullish members', '() => (Unresolved | undefined)', ['non-boolean', 'non-boolean', 'unknown', 'unknown']],
	['readonly array returns cannot supply predicate contracts', '() => ReadonlyArray<boolean>', ['non-boolean', 'non-boolean', 'non-boolean', 'non-boolean']],
]) {
	test(description, t => {
		const annotation = getAnnotation(expression);
		const policies = [
			{},
			{allowNullish: true},
			{functionTypesAreBoolean: true},
			{allowNullish: true, functionTypesAreBoolean: true},
		];
		t.assert.deepStrictEqual(policies.map(options => getJSDocumentBooleanState(annotation, options)), expected);
	});
}

test('primitive symbol returns are known while Symbol wrapper returns remain unresolved', t => {
	const options = {functionTypesAreBoolean: true};
	t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation('() => symbol'), options), 'non-boolean');
	t.assert.strictEqual(getJSDocumentBooleanState(getAnnotation('() => Symbol'), options), 'unknown');
});
