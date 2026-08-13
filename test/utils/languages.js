import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import htmlEslintPlugin from '@html-eslint/eslint-plugin';
import yml from 'eslint-plugin-yml';

const cssLanguage = {
	name: 'css',
	language: 'css/css',
	plugins: {css},
};

const htmlLanguage = {
	name: 'html',
	language: 'html/html',
	plugins: {html: htmlEslintPlugin},
};

const jsoncLanguage = {
	name: 'jsonc',
	language: 'json/jsonc',
	plugins: {json},
};

const json5Language = {
	name: 'json5',
	language: 'json/json5',
	plugins: {json},
};

const markdownLanguage = {
	name: 'markdown',
	language: 'markdown/commonmark',
	plugins: {markdown},
};

const yamlLanguage = {
	name: 'yaml',
	language: 'yml/yaml',
	plugins: {yml},
};

const languages = Object.fromEntries([
	cssLanguage,
	htmlLanguage,
	jsoncLanguage,
	json5Language,
	markdownLanguage,
	yamlLanguage,
].map(language => [language.name, language]));

export default languages;
