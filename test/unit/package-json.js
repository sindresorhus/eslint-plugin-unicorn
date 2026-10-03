import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {readPackageJson} from '../../rules/shared/package-json.js';

test('returns `undefined` without a readable `package.json`', t => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'unicorn-package-json-'));
	t.after(() => {
		fs.rmSync(directory, {recursive: true, force: true});
	});

	const emptyDirectory = path.join(directory, 'empty');
	fs.mkdirSync(emptyDirectory);
	t.assert.strictEqual(readPackageJson(emptyDirectory), undefined);

	const invalidDirectory = path.join(directory, 'invalid');
	fs.mkdirSync(invalidDirectory);
	fs.writeFileSync(path.join(invalidDirectory, 'package.json'), '{\n\t// A comment\n}');
	t.assert.strictEqual(readPackageJson(invalidDirectory), undefined);

	const validDirectory = path.join(directory, 'valid');
	fs.mkdirSync(validDirectory);
	fs.writeFileSync(path.join(validDirectory, 'package.json'), '{"name": "foo"}');
	t.assert.deepStrictEqual(readPackageJson(validDirectory), {
		path: path.join(validDirectory, 'package.json'),
		packageJson: {name: 'foo'},
	});
});
