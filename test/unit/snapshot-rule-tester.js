import path from 'node:path';
import test from 'ava';
import {getSnapshotFilename, visualizeEslintMessage} from '../utils/snapshot-rule-tester.js';

test('Snapshot filenames do not include absolute paths', t => {
	const filename = path.join(process.cwd(), 'test/fixtures/example.js');
	const fileSystemRoot = path.parse(process.cwd()).root;
	const externalFilename = path.join(fileSystemRoot, 'path/to/example.js');
	t.is(
		getSnapshotFilename(filename),
		'test/fixtures/example.js',
	);
	t.is(
		getSnapshotFilename(externalFilename),
		'path/to/example.js',
	);
});

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
