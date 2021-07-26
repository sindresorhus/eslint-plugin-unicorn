'use strict';
const {uniq} = require('lodash');
const getScopes = require('./get-scopes.js');

const getReferences = scope => uniq(
	getScopes(scope).flatMap(({references}) => references),
);

module.exports = getReferences;
