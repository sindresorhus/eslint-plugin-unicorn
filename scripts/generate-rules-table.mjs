#!/usr/bin/env node

// Automatically regenerates the rules table in readme.md.

import {
	RULES_TABLE_MARK,
	getRulesTable,
	updateFileContentInsideMark,
} from './utils.mjs';

await updateFileContentInsideMark(
	new URL('../readme.md', import.meta.url),
	getRulesTable(),
	RULES_TABLE_MARKER,
);
