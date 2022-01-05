#!/usr/bin/env node

// Automatically regenerates the rule notice.

import {
	RULE_NOTICE_MARK,
	getRuleNoticesSectionBody,
	getRules,
	updateFileContentInsideMark,
} from './utils.mjs';

const updateNotices = ruleId =>
	updateFileContentInsideMark(
		new URL(`../docs/rules/${ruleId}.md`, import.meta.url),
		getRuleNoticesSectionBody(ruleId),
		RULE_NOTICE_MARK,
	);

await Promise.all(
	getRules()
		.filter(rule => !rule.isDeprecated)
		.map(rule => updateNotices(rule.id)),
);
