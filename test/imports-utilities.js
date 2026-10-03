import test from 'node:test';
import {parse} from '@typescript-eslint/parser';
import {
	isRuntimeImportSpecifier,
	isTypeImportSpecifier,
} from '../rules/utils/imports.js';

const getImportSpecifiers = code => {
	const [declaration] = parse(code, {
		ecmaVersion: 'latest',
		sourceType: 'module',
	}).body;

	for (const specifier of declaration.specifiers) {
		specifier.parent = declaration;
	}

	return declaration.specifiers;
};

test('checks type import specifiers', t => {
	const [typeDefaultSpecifier] = getImportSpecifiers('import type Foo from "foo";');
	t.assert.strictEqual(isTypeImportSpecifier(typeDefaultSpecifier), true);
	t.assert.strictEqual(isRuntimeImportSpecifier(typeDefaultSpecifier), false);

	const [typeNamespaceSpecifier] = getImportSpecifiers('import type * as Foo from "foo";');
	t.assert.strictEqual(isTypeImportSpecifier(typeNamespaceSpecifier), true);
	t.assert.strictEqual(isRuntimeImportSpecifier(typeNamespaceSpecifier), false);

	const [typeNamedSpecifier, runtimeNamedSpecifier] = getImportSpecifiers('import {type Foo, Bar} from "foo";');
	t.assert.strictEqual(isTypeImportSpecifier(typeNamedSpecifier), true);
	t.assert.strictEqual(isRuntimeImportSpecifier(typeNamedSpecifier), false);
	t.assert.strictEqual(isTypeImportSpecifier(runtimeNamedSpecifier), false);
	t.assert.strictEqual(isRuntimeImportSpecifier(runtimeNamedSpecifier), true);
});
