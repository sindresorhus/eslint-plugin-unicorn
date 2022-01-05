#!/usr/bin/env node

// Automatically regenerates the rules table in readme.md.

import {
	RULES_TABLE_START_MARK,
	RULES_TABLE_END_MARK,
	getRulesTable,
	updateFileContentInsideMarkers,
} from './utils.mjs';

await updateFileContentInsideMarkers(
	new URL('../readme.md', import.meta.url),
	getRulesTable(),
	RULES_TABLE_START_MARK,
	RULES_TABLE_END_MARK,
);
