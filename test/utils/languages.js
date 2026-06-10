import css from '@eslint/css';
import markdown from '@eslint/markdown';

const cssLanguage = {
	name: 'css',
	language: 'css/css',
	plugins: {css},
};

const markdownLanguage = {
	name: 'markdown',
	language: 'markdown/commonmark',
	plugins: {markdown},
};

const languages = Object.fromEntries([
	cssLanguage,
	markdownLanguage,
].map(language => [language.name, language]));

export default languages;
