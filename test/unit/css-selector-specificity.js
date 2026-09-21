import test from 'ava';
import {parse, toPlainObject} from '@eslint/css-tree';
import {
	compareSpecificity,
	getMaximumSpecificity,
	getRuleSelectorSpecificity,
	getRuleSpecificities,
} from '../../rules/shared/css-selector-specificity.js';

const parseRule = selector => toPlainObject(parse(`${selector} {}`)).children.at(0);
const getSelectorSpecificities = selector => parseRule(selector).prelude.children.map(selector => getRuleSelectorSpecificity(selector, [0, 0, 0]));

test('compares specificity lexicographically', t => {
	t.true(compareSpecificity([1, 0, 0], [0, 100, 100]) > 0);
	t.true(compareSpecificity([0, 2, 0], [0, 1, 100]) > 0);
	t.is(compareSpecificity([0, 1, 1], [0, 1, 1]), 0);
	t.deepEqual(getMaximumSpecificity([[0, 2, 0], [1, 0, 0], [0, 10, 0]]), [1, 0, 0]);
});

test('calculates selector specificity', t => {
	t.deepEqual(getSelectorSpecificities('#dialog'), [[1, 0, 0]]);
	t.deepEqual(getSelectorSpecificities('.dialog[open]:hover'), [[0, 3, 0]]);
	t.deepEqual(getSelectorSpecificities('dialog::before'), [[0, 0, 2]]);
	t.deepEqual(getSelectorSpecificities('*'), [[0, 0, 0]]);
	t.deepEqual(getSelectorSpecificities(':where(#dialog)'), [[0, 0, 0]]);
	t.deepEqual(getSelectorSpecificities(':is(.dialog, #dialog)'), [[1, 0, 0]]);
	t.deepEqual(getSelectorSpecificities(':is(::before, *)'), [[0, 0, 0]]);
	t.deepEqual(getSelectorSpecificities(':not(.dialog, #dialog)'), [[1, 0, 0]]);
	t.deepEqual(getSelectorSpecificities(':has(.dialog, #dialog)'), [[1, 0, 0]]);
	t.deepEqual(getSelectorSpecificities(':nth-child(2n of .dialog, #dialog)'), [[1, 1, 0]]);
	t.deepEqual(getSelectorSpecificities(':host(#dialog)'), [[1, 1, 0]]);
	t.deepEqual(getSelectorSpecificities('::slotted(#dialog)'), [[1, 0, 1]]);
});

test('calculates explicit and implicit nesting specificity', t => {
	const parentSpecificity = [1, 0, 0];
	const explicitSelector = parseRule('& a').prelude.children.at(0);
	const implicitSelector = parseRule('a').prelude.children.at(0);

	t.deepEqual(getRuleSelectorSpecificity(explicitSelector, parentSpecificity), [1, 0, 1]);
	t.deepEqual(getRuleSelectorSpecificity(implicitSelector, parentSpecificity), [1, 0, 1]);
});

test('excludes pseudo-element branches from nesting parents', t => {
	t.deepEqual(getRuleSpecificities(parseRule('dialog, ::before'), [0, 0, 0]), [[0, 0, 1]]);
	t.deepEqual(getRuleSpecificities(parseRule(':is(::before)'), [0, 0, 0]), []);
});
