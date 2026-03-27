import test from 'ava';
import {visualizeEslintMessage} from '../utils/snapshot-rule-tester.js';

test('Snapshot formatter includes diagnostic location', t => {
	const code = [
		'first();',
		'second();',
	].join('\n');

	t.is(
		visualizeEslintMessage(code, {
			line: 2,
			column: 1,
			endLine: 2,
			endColumn: 7,
			message: 'Problem.',
		}),
		[
			'  1 | first();',
			'> 2 | second();',
			'    | ^^^^^^ Problem.',
		].join('\n'),
	);
});

test('Snapshot formatter changes when diagnostic location moves', t => {
	const code = [
		'first();',
		'second();',
	].join('\n');

	t.not(
		visualizeEslintMessage(code, {
			line: 1,
			column: 1,
			message: 'Problem.',
		}),
		visualizeEslintMessage(code, {
			line: 2,
			column: 1,
			message: 'Problem.',
		}),
	);
});
