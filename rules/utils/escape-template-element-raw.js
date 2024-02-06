'use strict';

const escapeTemplateElementRaw = string => string.replaceAll(
	/(?<=(?:^|[^\\])(?:\\\\)*)(?<symbol>(?:`|\$(?={)))/g,
	'\\$<symbol>',
);
module.exports = escapeTemplateElementRaw;
