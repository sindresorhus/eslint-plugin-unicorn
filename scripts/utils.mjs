import {promises as fs} from 'node:fs';
import eslintPluginUnicorn from '../index.js';

const {rules, configs} = eslintPluginUnicorn;

export function getRuleInfo(ruleId) {
	const rule = rules[ruleId];

	return {
		id: ruleId,
		meta: rule.meta,
		get isRecommended() {
			return ['error', 'warn'].includes(configs.recommended.rules[`unicorn/${ruleId}`]);
		},
		get isDeprecated() {
			return Boolean(rule.meta.deprecated);
		},
		get isFixable() {
			return Boolean(rule.meta.fixable);
		},
		get hasSuggestions() {
			return Boolean(rule.meta.hasSuggestions);
		},
	};
}

export function getRules() {
	return Object.keys(rules).sort().map(ruleId => getRuleInfo(ruleId));
}

const createHtmlComment = comment => `<!-- ${comment} -->`;
export const createMark = (marker, script) => ({
	comment: createHtmlComment(`Do not manually modify ${marker} part. Run: \`npm run ${script}\``),
	start: createHtmlComment(marker),
	end: createHtmlComment(`/${marker}`),
});

function replaceContentInsideMark(original, text, marker) {
	const startMarkIndex = original.indexOf(marker.start);
	const endMarkIndex = original.indexOf(marker.end);

	if (startMarkIndex === -1) {
		throw new Error(`'${marker.start}' mark lost.`);
	}

	if (endMarkIndex === -1) {
		throw new Error(`'${marker.end}' mark lost.`);
	}

	if (startMarkIndex > endMarkIndex) {
		throw new Error(`'${marker.start}' should used before '${marker.end}'.`);
	}

	if (text) {
		text = `${text}\n`;
	}

	text = `\n${text}`;

	const before = original.slice(0, startMarkIndex + marker.start.length);
	const after = original.slice(endMarkIndex);

	return before + text + after;
}

export async function updateFileContentInsideMark(file, text, marker) {
	const original = await fs.readFile(file, 'utf8');
	const content = replaceContentInsideMark(original, text, marker);

	if (content === original) {
		return;
	}

	await fs.writeFile(file, content);
}

