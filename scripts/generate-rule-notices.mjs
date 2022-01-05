#!/usr/bin/env node

// Automatically regenerates the rule notice.

import {
	RULE_NOTICE_MARKER,
	getRuleNoticesSectionBody,
	getRules,
	updateFileContentInsideMarker,
} from './utils.mjs';

const updateNotices = ruleId =>
	updateFileContentInsideMarker(
		new URL(`../docs/rules/${ruleId}.md`, import.meta.url),
		getRuleNoticesSectionBody(ruleId),
		RULE_NOTICE_MARKER,
	);

await Promise.all(
	getRules()
		.filter(rule => !rule.isDeprecated)
		.map(rule => updateNotices(rule.id)),
);
