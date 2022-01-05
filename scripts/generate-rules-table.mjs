#!/usr/bin/env node

// Automatically regenerates the rules table in readme.md.

import {
	updateFileContentInsideMark,
} from './utils.mjs';
import {
	RULES_TABLE_MARK,
	getRulesTable,
} from './rules-table.mjs';

await updateFileContentInsideMark(
	new URL('../readme.md', import.meta.url),
	getRulesTable(),
	RULES_TABLE_MARK,
);
