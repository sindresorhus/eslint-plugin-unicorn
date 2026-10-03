import test from 'node:test';
import config from '../../.eslint-doc-generatorrc.js';

const headerMarker = '<!-- end auto-generated rule header -->';

test('shortens disabled-only preset notices', t => {
	for (const notice of [
		'🚫 This rule is _disabled_ in the `recommended` config.',
		'🚫 This rule is _disabled_ in the following configs: `recommended`, `recommended-css`, `unopinionated`.',
	]) {
		const document = `# rule\n\n${notice}\n\n${headerMarker}\n\nRule description.\n`;
		const expected = `# rule\n\n🚫 Disabled by default.\n\n${headerMarker}\n\nRule description.\n`;
		t.assert.strictEqual(config.postprocess(document), expected);
		t.assert.strictEqual(config.postprocess(expected), expected);
	}
});

test('preserves enabled and mixed preset notices', t => {
	for (const notice of [
		'💼 This rule is enabled in the `recommended` config.',
		'💼🚫 This rule is enabled in the `recommended` config. This rule is _disabled_ in the `unopinionated` config.',
	]) {
		const document = `# rule\n\n${notice}\n\n${headerMarker}\n`;
		t.assert.strictEqual(config.postprocess(document), document);
	}
});

test('preserves rule bodies and documents without a rule header', t => {
	const body = '\n\n🚫 This rule is _disabled_ in the `recommended` config.\n';
	const document = `# rule\n\n${headerMarker}${body}`;
	t.assert.strictEqual(config.postprocess(document), document);
	t.assert.strictEqual(config.postprocess(`# Rules${body}`), `# Rules${body}`);
});
