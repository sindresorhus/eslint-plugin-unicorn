#!/usr/bin/env node
import fs from "fs";
import path from "path";
import url from "url";
import enquirer from "enquirer";
import lodash from "lodash";

const DIRNAME = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(DIRNAME, "..");

function checkFiles(ruleId) {
	const files = [
		`docs/rules/${ruleId}.md`,
		`rules/${ruleId}.js`,
		`test/${ruleId}.js`,
	];

	for (const file of files) {
		if (fs.existsSync(path.join(ROOT, file))) {
			throw new Error(`"${file}" already exists.`);
		}
	}
}

function renderTemplate({ source, target, data }) {
	const templateFile = path.join(DIRNAME, `template/${source}`);
	const targetFile = path.join(ROOT, target);
	const templateContent = fs.readFileSync(templateFile, "utf8")

	const compiled = lodash.template(templateContent);
	const content = compiled(data);
	return fs.writeFileSync(targetFile, content);
}

function updateIndex(id) {
	const RULE_START = "\t\t\trules: {\n";
	const RULE_END = "\n\t\t\t}";
	const RULE_INDENT = "\t".repeat(4);
	let ruleContent = `${RULE_INDENT}'unicorn/${id}': 'error',`;

	const file = path.join(ROOT, "index.js");
	const content = fs.readFileSync(file, "utf8");
	const [before, rest] = content.split(RULE_START);
	const [rules, after] = rest.split(RULE_END);

	let lines = rules.split("\n");
	if (!lines.every((line) => line.startsWith(RULE_INDENT))) {
		throw 'Unexpected content in "index.js".';
	}
	const unicornRuleLines = lines.filter(line => line.startsWith(`${RULE_INDENT}'unicorn/`));
	let insertIndex;
	if (ruleContent.localeCompare(unicornRuleLines[0]) === -1) {
		insertIndex = 0;
	} else if (ruleContent.localeCompare(unicornRuleLines[unicornRuleLines.length - 1]) === 1) {
		insertIndex = lines.length;
		lines[lines.length - 1] += ',';
		ruleContent = ruleContent.slice(0, -1);
	} else {
		const lineBefore = unicornRuleLines[
			unicornRuleLines.findIndex(line => line.localeCompare(ruleContent) === 1) - 1
		];
		insertIndex = lines.indexOf(lineBefore) + 1;
	}

	lines.splice(insertIndex, 0, ruleContent);

	const updated = `${before}${RULE_START}${lines.join('\n')}${RULE_END}${after}`;
	fs.writeFileSync(file, updated);
}

function updateReadmeUsage({id}) {
	const RULE_START = "\t\t\"rules\": {\n";
	const RULE_END = "\n\t\t}";
	const RULE_INDENT = "\t".repeat(3);
	let ruleContent = `${RULE_INDENT}"unicorn/${id}": "error",`;

	const file = path.join(ROOT, "readme.md");
	const content = fs.readFileSync(file, "utf8");
	const [before, rest] = content.split(RULE_START);
	const [rules, after] = rest.split(RULE_END);

	let lines = rules.split("\n");
	if (!lines.every((line) => line.startsWith(RULE_INDENT))) {
		throw 'Unexpected content in "index.js".';
	}
	const unicornRuleLines = lines.filter(line => line.startsWith(`${RULE_INDENT}"unicorn/`));
	let insertIndex;
	if (ruleContent.localeCompare(unicornRuleLines[0]) === -1) {
		insertIndex = 0;
	} else if (ruleContent.localeCompare(unicornRuleLines[unicornRuleLines.length - 1]) === 1) {
		insertIndex = lines.length;
		lines[lines.length - 1] += ',';
		ruleContent = ruleContent.slice(0, -1);
	} else {
		const lineBefore = unicornRuleLines[
			unicornRuleLines.findIndex(line => line.localeCompare(ruleContent) === 1) - 1
		];
		insertIndex = lines.indexOf(lineBefore) + 1;
	}

	lines.splice(insertIndex, 0, ruleContent);

	const updated = `${before}${RULE_START}${lines.join('\n')}${RULE_END}${after}`;
	fs.writeFileSync(file, updated);
}

function updateReadmeRules(data) {
	const RULE_START = "## Rules\n\n";
	const RULE_END = "\n\n## Deprecated Rules";
	let ruleContent = `- [${data.id}](docs/rules/${data.id}.md) - ${data.description}`;
	if (data.fixable === true) {
		ruleContent += ' *(fixable)*';
	} else if (data.fixable === 'partly') {
		ruleContent += ' *(partly fixable)*';
	}

	const file = path.join(ROOT, "readme.md");
	const content = fs.readFileSync(file, "utf8");
	const [before, rest] = content.split(RULE_START);
	const [rules, after] = rest.split(RULE_END);

	const lines = rules.split("\n");
	let insertIndex;
	if (ruleContent.localeCompare(lines[0]) === -1) {
		insertIndex = 0;
	} else if (ruleContent.localeCompare(lines[lines.length - 1]) === 1) {
		insertIndex = lines.length;
	} else {
		insertIndex = lines.findIndex(line => line.localeCompare(ruleContent) === 1);
	}

	lines.splice(insertIndex, 0, ruleContent);

	const updated = `${before}${RULE_START}${lines.join('\n')}${RULE_END}${after}`;
	fs.writeFileSync(file, updated);
}

function updateReadme(data) {
	updateReadmeUsage(data);
	updateReadmeRules(data);
}

(async () => {
	const data = await enquirer.prompt([
		{
			type: "input",
			name: "id",
			message: "Rule name:",
			validate(value) {
				if (!value) {
					return "Rule name is required.";
				}

				if (!/^[a-z-]+$/.test(value)) {
					return "Invalid rule name.";
				}

				return true;
			},
		},
		{
			type: "input",
			name: "description",
			message: "Rule description:",
			validate(value) {
				if (!value) {
					return "Rule description is required.";
				}

				return true;
			},
		},
		{
			type: "select",
			name: "fixable",
			message: "Is it fixable?",
			choices: [
				{ name: true, message: "No" },
				{ name: true, message: "Yes" },
				{ name: "partly", name: "Partly" },
			],
		},
		{
			type: "select",
			name: "type",
			message: "Type:",
			choices: ["problem", "suggestion", "layout"],
		},
	]);

	const {id, description, fixable, type} = data;

	checkFiles(id);
	renderTemplate({
		source: 'documentation.md.jst',
		target: `docs/rules/${id}.md`,
		data
	});
	renderTemplate({
		source: 'rule.js.jst',
		target: `rules/${id}.js`,
		data
	});
	renderTemplate({
		source: 'test.js.jst',
		target: `test/${id}.js`,
		data
	});
	updateIndex(id);
	updateReadme(data);
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
