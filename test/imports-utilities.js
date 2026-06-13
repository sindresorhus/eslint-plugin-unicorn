import test from 'ava';
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
	t.true(isTypeImportSpecifier(typeDefaultSpecifier));
	t.false(isRuntimeImportSpecifier(typeDefaultSpecifier));

	const [typeNamespaceSpecifier] = getImportSpecifiers('import type * as Foo from "foo";');
	t.true(isTypeImportSpecifier(typeNamespaceSpecifier));
	t.false(isRuntimeImportSpecifier(typeNamespaceSpecifier));

	const [typeNamedSpecifier, runtimeNamedSpecifier] = getImportSpecifiers('import {type Foo, Bar} from "foo";');
	t.true(isTypeImportSpecifier(typeNamedSpecifier));
	t.false(isRuntimeImportSpecifier(typeNamedSpecifier));
	t.false(isTypeImportSpecifier(runtimeNamedSpecifier));
	t.true(isRuntimeImportSpecifier(runtimeNamedSpecifier));
});
