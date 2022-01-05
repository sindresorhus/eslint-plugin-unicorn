#!/usr/bin/env node

// Automatically regenerates the rule notice.

import {
	RULE_NOTICE_START_MARK,
	RULE_NOTICE_END_MARK,
	getRuleNoticesSectionBody,
	getRules,
	updateFileContentInsideMarkers,
} from './utils.mjs';

const updateNotices = ruleId =>
	updateFileContentInsideMarkers(
		new URL(`../docs/rules/${ruleId}.md`, import.meta.url),
		getRuleNoticesSectionBody(ruleId),
		RULE_NOTICE_START_MARK,
		RULE_NOTICE_END_MARK,
	);

await Promise.all(
	getRules()
		.filter(rule => !rule.isDeprecated)
		.map(rule => updateNotices(rule.id)),
);
