#!/usr/bin/env node

// Automatically regenerates the rule notice.

import fs from 'node:fs/promises';
import eslintPluginUnicorn from '../index.js';
import {RULE_NOTICE_START_MARK, RULE_NOTICE_END_MARK, getRuleNotice} from './utils.mjs';

const rules = Object.entries(eslintPluginUnicorn.rules).filter(([, rule]) => !rule.meta.deprecated).map(([id]) => id);

async function updateNotice(id) {
	const documentationFile = new URL(`../docs/rules/${id}.md`, import.meta.url);
	const original = await fs.readFile(documentationFile, 'utf8');
	const startMarkIndex = original.indexOf(RULE_NOTICE_START_MARK);
	const endMarkIndex = original.indexOf(RULE_NOTICE_END_MARK);

	if (startMarkIndex === -1) {
		throw new Error('Rule notice start mark lost.');
	}

	if (endMarkIndex === -1) {
		throw new Error('Rule notice end mark lost.');
	}

	const before = original.slice(0, startMarkIndex + RULE_NOTICE_START_MARK.length);
	const after = original.slice(endMarkIndex);
	let notice = getRuleNotice(id);
	if (notice) {
		notice = `${notice}\n`;
	}

	notice = `\n${notice}`;
	const content = before + notice + after;

	if (content !== original) {
		await fs.writeFile(documentationFile, content);
	}
}

await Promise.all(rules.map(id => updateNotice(id)));
