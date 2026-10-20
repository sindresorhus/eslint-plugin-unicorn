import test from 'node:test';
import {getJSDocumentBooleanState} from '../../rules/utils/get-jsdoc-boolean-state.js';
import {parseJSDocumentType} from '../../rules/utils/parse-jsdoc-type.js';

const getAnnotation = expression => ({type: parseJSDocumentType(expression)});

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
