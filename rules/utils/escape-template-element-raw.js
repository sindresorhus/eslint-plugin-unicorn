'use strict';

const escapeTemplateElementRaw = string => string.replaceAll(
	/(?<=(?:^|[^\\])(?:\\\\)*)(?<symbol>(?:`|\$(?={)))/g,
	String.raw`\$<symbol>`,
);
module.exports = escapeTemplateElementRaw;
