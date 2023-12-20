'use strict';

module.exports = string => string.replaceAll(
	/(?<=(?:^|[^\\])(?:\\\\)*)(?<symbol>(?:`|\$(?={)))/g,
	'\\$<symbol>',
);
