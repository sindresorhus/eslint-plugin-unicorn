import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const options = {
	checkExportFrom: true,
	styles: {
		unassigned: {
			unassigned: true,
			named: false,
		},
		default: {
			default: true,
			named: false,
		},
		namespace: {
			namespace: true,
			named: false,
		},
		named: {
			named: true,
		},
	},
};

const unassignedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'unassigned',
		moduleName: 'unassigned',
	},
};

const defaultError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'default',
		moduleName: 'default',
	},
};

function getNamespaceError(moduleName) {
	return {
		messageId: 'importStyle',
		data: {
			allowedStyles: 'namespace',
			moduleName,
		},
	}
}

const namedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'named',
		moduleName: 'named',
	},
};

const addDefaultOptions = test => {
	if (typeof test === 'string') {
		test = {
			code: test,
		};
	}

	return {
		options: [options],
		...test,
	};
};

test({
	valid: [
		'require(\'unassigned\')',
		'const {} = require(\'unassigned\')',
		'import \'unassigned\'',
		'import {} from \'unassigned\'',
		'import(\'unassigned\')',
		'export {} from \'unassigned\'',

		'const x = require(\'default\')',
		'const {default: x} = require(\'default\')',
		'const [] = require("default")',
		'import x from \'default\'',
		outdent`
			async () => {
				const {default: x} = await import('default');
			}
		`,
		'export {default} from \'default\'',

		'const x = require(\'namespace\')',
		'const [] = require("namespace")',
		'import * as x from \'namespace\'',
		outdent`
			async () => {
				const x = await import('namespace');
			}
		`,
		'export * from \'namespace\'',

		'const {x} = require(\'named\')',
		'const {...rest} = require("named")',
		'const {x: y} = require(\'named\')',
		'import {x} from \'named\'',
		'import {x as y} from \'named\'',
		outdent`
			async () => {
				const {x} = await import('named');
			}
		`,
		outdent`
			async () => {
				const {x: y} = await import('named');
			}
		`,
		'export {x} from \'named\'',
		'export {x as y} from \'named\'',

		{
			code: 'import {inspect} from \'util\'',
			options: [],
		},
		{
			code: 'import {inspect} from \'node:util\'',
			options: [],
		},
		{
			code: 'const {inspect} = require(\'util\')',
			options: [],
		},
		{
			code: 'const {inspect} = require(\'node:util\')',
			options: [],
		},
		{
			code: 'import chalk from \'chalk\'',
			options: [],
		},
		{
			code: 'import {default as chalk} from \'chalk\'',
			options: [],
		},
		{
			code: 'export {promisify, callbackify} from \'util\'',
			options: [],
		},
		{
			code: 'export {promisify, callbackify} from \'node:util\'',
			options: [],
		},

		{
			code: 'require(\'chalk\')',
			options: [{
				styles: {},
				extendDefaultStyles: false,
			}],
		},
		{
			code: 'import \'chalk\'',
			options: [{
				checkImport: false,
			}],
		},
		{
			code: outdent`
				async () => {
					const {red} = await import('chalk');
				}
			`,
			options: [{
				checkDynamicImport: false,
			}],
		},
		{
			code: 'import(\'chalk\')',
			options: [{
				checkDynamicImport: false,
			}],
		},
		{
			code: 'require(\'chalk\')',
			options: [{
				checkRequire: false,
			}],
		},
		{
			code: 'const {red} = require(\'chalk\')',
			options: [{
				checkRequire: false,
			}],
		},

		{
			code: 'import util, {inspect} from \'named-or-default\'',
			options: [{
				styles: {
					'named-or-default': {
						named: true,
						default: true,
					},
				},
			}],
		},

		'require(1, 2, 3)',
		'require(variable)',
		'const x = require(variable)',
		'const x = require(\'unassigned\').x',
		outdent`
			async () => {
				const {red} = await import(variable);
			}
		`,

		{
			code: 'import * as React from \'react\'',
			options: [{
				styles: {
					react: {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'import * as ReactDOM from \'react-dom\'',
			options: [{
				styles: {
					'react-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'import * as Router from \'react-router\'',
			options: [{
				styles: {
					'react-router': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'import * as RouterDOM from \'react-router-dom\'',
			options: [{
				styles: {
					'react-router-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'import * as PropTypes from \'prop-types\'',
			options: [{
				styles: {
					'prop-types': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'import * as _ from \'lodash\'',
			options: [{
				styles: {
					lodash: {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'import * as _ from \'lodash-es\'',
			options: [{
				styles: {
					'lodash-es': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const React = require(\'react\')',
			options: [{
				styles: {
					react: {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const ReactDOM = require(\'react-dom\')',
			options: [{
				styles: {
					'react-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const Router = require(\'react-router\')',
			options: [{
				styles: {
					'react-router': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const RouterDOM = require(\'react-router-dom\')',
			options: [{
				styles: {
					'react-router-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const PropTypes = require(\'prop-types\')',
			options: [{
				styles: {
					'prop-types': {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const _ = require(\'lodash\')',
			options: [{
				styles: {
					lodash: {
						namespace: true,
						named: false,
					},
				},
			}],
		},
		{
			code: 'const _ = require(\'lodash-es\')',
			options: [{
				styles: {
					'lodash-es': {
						namespace: true,
						named: false,
					},
				},
			}],
		},

		{
			code: outdent`
				import * as React from 'react';
				React.useState(0);
				React.useEffect(() => {});
			`,
			options: [
				{
					styles: {
						react: {
							namespace: true,
							named: false,
						},
					},
				},
			],
		},
		{
			code: outdent`
				const _ = require('lodash');
				_.map([1, 2, 3], x => x * 2);
				_.filter([1, 2, 3], x => x > 2);
			`,
			options: [
				{
					styles: {
						lodash: {
							namespace: true,
							named: false,
						},
					},
				},
			],
		},
		{
			code: outdent`
				import * as ReactDOM from 'react-dom';
				ReactDOM.render(App(), document.body);
				ReactDOM.hydrate(App(), document.body);
			`,
			options: [
				{
					styles: {
						"react-dom": {
							namespace: true,
							named: false,
						},
					},
				},
			],
		},
		{
			code: outdent`
				const PropTypes = require('prop-types');
				Component.propTypes = {
					name: PropTypes.string,
					age: PropTypes.number,
					isActive: PropTypes.bool,
				};
			`,
			options: [
				{
					styles: {
						"prop-types": {
							namespace: true,
							named: false,
						},
					},
				},
			],
		},
		{
			code: outdent`
				import * as Router from 'react-router';
				function App() {
					const params = Router.useParams();
					return Router.createElement('div', null,
						Router.createElement(Router.Switch, null,
							Router.createElement(Router.Route, { path: "/" })
						)
					);
				}
			`,
			options: [
				{
					styles: {
						"react-router": {
							namespace: true,
							named: false,
						},
					},
				},
			],
		},
		{
			code: outdent`
				const React = "not the real React";
				import * as React_ from "react";
				React_.useState(0);
			`,
			options: [
				{
					styles: {
						react: {
							namespace: true,
							named: false,
						},
					},
				},
			],
		},
	],

	invalid: [
		{
			code: 'const {x} = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'const {default: x} = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'import x from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const {default: x} = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: 'const x = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'import * as x from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const x = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: 'const {x: y} = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'import {x} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'import {x as y} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: 'const {...rest} = require("unassigned")',
			errors: [unassignedError],
		},
		{
			code: 'const [] = require("unassigned")',
			errors: [unassignedError],
		},
		{
			code: 'export * from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'export {x} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'export {x as y} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'export {default} from \'unassigned\'',
			errors: [unassignedError],
		},

		{
			code: 'require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'const {} = require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'const {...rest} = require("default")',
			errors: [defaultError],
		},
		{
			code: 'import \'default\'',
			errors: [defaultError],
		},
		{
			code: 'import {} from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'import(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'import * as x from \'default\'',
			errors: [defaultError],
		},
		{
			code: outdent`
				async () => {
					const x = await import('default');
				}
			`,
			errors: [defaultError],
		},
		{
			code: 'const {x} = require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'const {x: y} = require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'import {x} from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'import {x as y} from \'default\'',
			errors: [defaultError],
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('default');
				}
			`,
			errors: [defaultError],
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('default');
				}
			`,
			errors: [defaultError],
		},
		{
			code: 'export * from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'export {x} from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'export {x as y} from \'default\'',
			errors: [defaultError],
		},

		{
			code: 'require(\'namespace\')',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'const {} = require(\'namespace\')',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import {} from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import(\'namespace\')',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'const {default: x} = require(\'namespace\')',
			output: 'const namespace = require(\'namespace\')',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'const {...rest} = require("namespace")',
			output: 'const namespace = require("namespace")',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import x from \'namespace\'',
			output: 'import * as namespace from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'const {x} = require(\'namespace\')',
			output: 'const namespace = require(\'namespace\')',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'const {x: y} = require(\'namespace\')',
			output: 'const namespace = require(\'namespace\')',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import {x} from \'namespace\'',
			output: 'import * as namespace from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import {x as y} from \'namespace\'',
			output: 'import * as namespace from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('namespace');
				}
			`,
			errors: [getNamespaceError('namespace')],
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('namespace');
				}
			`,
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'export {x} from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'export {x as y} from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'export {default} from \'namespace\'',
			errors: [getNamespaceError('namespace')],
		},

		{
			code: 'require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const {} = require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const [] = require("named")',
			errors: [namedError],
		},
		{
			code: 'import \'named\'',
			errors: [namedError],
		},
		{
			code: 'import {} from \'named\'',
			errors: [namedError],
		},
		{
			code: 'import(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const x = require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const {default: x} = require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'import x from \'named\'',
			errors: [namedError],
		},
		{
			code: outdent`
				async () => {
					const {default: x} = await import('named');
				}
			`,
			errors: [namedError],
		},
		{
			code: 'import * as x from \'named\'',
			errors: [namedError],
		},
		{
			code: outdent`
				async () => {
					const x = await import('named');
				}
			`,
			errors: [namedError],
		},
		{
			code: 'export * from \'named\'',
			errors: [namedError],
		},
		{
			code: 'export {default} from \'named\'',
			errors: [namedError],
		},

		{
			code: 'import util, {inspect} from \'named\'',
			errors: [namedError],
		},
		{
			code: 'import util, {inspect} from \'default\'',
			errors: [defaultError],
		},

		{
			code: 'import util from \'util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import util from \'node:util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import * as util from \'util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import * as util from \'node:util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'const util = require(\'util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'const util = require(\'node:util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'node:util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'ut\' + \'il\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'node:\' + \'util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'import {red} from \'chalk\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import {red as green} from \'chalk\'',
			options: [],
			errors: 1,
		},
		{
			code: outdent`
				async () => {
					const {red} = await import('chalk');
				}
			`,
			options: [],
			errors: 1,
		},

		{
			code: 'require(\'no-unassigned\')',
			options: [{
				styles: {
					'no-unassigned': {
						named: true,
						namespace: true,
						default: true,
					},
				},
			}],
			errors: [{
				messageId: 'importStyle',
				data: {
					allowedStyles: 'named, namespace, or default',
					moduleName: 'no-unassigned',
				},
			}],
		},

		{
			code: 'import {x} from "namespace"',
			output: 'import * as namespace from "namespace"',
			options: [{
				styles: {
					namespace: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import {x, y} from "namespace"',
			output: 'import * as namespace from "namespace"',
			options: [{
				styles: {
					namespace: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import {x as y} from "namespace"',
			output: 'import * as namespace from "namespace"',
			options: [{
				styles: {
					namespace: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('namespace')],
		},
		{
			code: 'import {useState} from "react"',
			output: 'import * as React from "react"',
			options: [{
				styles: {
					react: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react')],
		},
		{
			code: 'import {useState, useEffect} from "react"',
			output: 'import * as React from "react"',
			options: [{
				styles: {
					react: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react')],
		},
		{
			code: 'import {render} from "react-dom"',
			output: 'import * as ReactDOM from "react-dom"',
			options: [{
				styles: {
					'react-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-dom')],
		},
		{
			code: 'import {Route, Switch} from "react-router"',
			output: 'import * as ReactRouter from "react-router"',
			options: [{
				styles: {
					'react-router': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-router')],
		},
		{
			code: 'import {BrowserRouter} from "react-router-dom"',
			output: 'import * as ReactRouterDOM from "react-router-dom"',
			options: [{
				styles: {
					'react-router-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-router-dom')],
		},
		{
			code: 'import {string, number} from "prop-types"',
			output: 'import * as PropTypes from "prop-types"',
			options: [{
				styles: {
					'prop-types': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('prop-types')],
		},
		{
			code: 'const {useState, useEffect} = require("react")',
			output: 'const React = require("react")',
			options: [{
				styles: {
					react: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react')],
		},
		{
			code: 'const {render} = require("react-dom")',
			output: 'const ReactDOM = require("react-dom")',
			options: [{
				styles: {
					'react-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-dom')],
		},
		{
			code: 'const {Route, Switch} = require("react-router")',
			output: 'const ReactRouter = require("react-router")',
			options: [{
				styles: {
					'react-router': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-router')],
		},
		{
			code: 'const {BrowserRouter} = require("react-router-dom")',
			output: 'const ReactRouterDOM = require("react-router-dom")',
			options: [{
				styles: {
					'react-router-dom': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-router-dom')],
		},
		{
			code: 'const {string, number} = require("prop-types")',
		 output: 'const PropTypes = require("prop-types")',
			options: [{
				styles: {
					'prop-types': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('prop-types')],
		},
		{
			code: 'import {map} from "lodash"',
			output: 'import * as _ from "lodash"',
			options: [{
				styles: {
					lodash: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('lodash')],
		},
		{
			code: 'const {map} = require("lodash")',
			output: 'const _ = require("lodash")',
			options: [{
				styles: {
					lodash: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('lodash')],
		},
		{
			code: 'import {map} from "lodash-es"',
			output: 'import * as _ from "lodash-es"',
			options: [{
				styles: {
					'lodash-es': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('lodash-es')],
		},
		{
			code: 'const {map} = require("lodash-es")',
			output: 'const _ = require("lodash-es")',
			options: [{
				styles: {
					'lodash-es': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('lodash-es')],
		},
		{
			code: 'import {$} from "jquery"',
			output: 'import * as $ from "jquery"',
			options: [{
				styles: {
					jquery: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('jquery')],
		},
		{
			code: 'const {$} = require("jquery")',
			output: 'const $ = require("jquery")',
			options: [{
				styles: {
					jquery: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('jquery')],
		},
		{
			code: 'import {css} from "styled-components"',
			output: 'import * as styled from "styled-components"',
			options: [{
				styles: {
					'styled-components': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('styled-components')],
		},
		{
			code: 'const {css} = require("styled-components")',
		 	output: 'const styled = require("styled-components")',
			options: [{
				styles: {
					'styled-components': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('styled-components')],
		},
		{
			code: 'import {createStore} from "redux"',
			output: 'import * as Redux from "redux"',
			options: [{
				styles: {
					redux: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('redux')],
		},
		{
			code: 'const {createStore} = require("redux")',
			output: 'const Redux = require("redux")',
			options: [{
				styles: {
					redux: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('redux')],
		},
		{
			code: 'import {connect} from "react-redux"',
			output: 'import * as ReactRedux from "react-redux"',
			options: [{
				styles: {
					'react-redux': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-redux')],
		},
		{
			code: 'const {connect} = require("react-redux")',
			output: 'const ReactRedux = require("react-redux")',
			options: [{
				styles: {
					'react-redux': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('react-redux')],
		},
		{
			code: 'import {get} from "axios"',
			output: 'import * as Axios from "axios"',
			options: [{
				styles: {
					axios: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('axios')],
		},
		{
			code: 'const {get} = require("axios")',
			output: 'const Axios = require("axios")',
			options: [{
				styles: {
					axios: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('axios')],
		},
		{
			code: 'import {format} from "date-fns"',
			output: 'import * as dateFns from "date-fns"',
			options: [{
				styles: {
					'date-fns': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('date-fns')],
		},
		{
			code: 'const {format} = require("date-fns")',
			output: 'const dateFns = require("date-fns")',
			options: [{
				styles: {
					'date-fns': {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('date-fns')],
		},
		{
			code: 'import {map} from "ramda"',
			output: 'import * as R from "ramda"',
			options: [{
				styles: {
					ramda: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('ramda')],
		},
		{
			code: 'const {map} = require("ramda")',
			output: 'const R = require("ramda")',
			options: [{
				styles: {
					ramda: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('ramda')],
		},
		{
			code: 'import {Observable} from "rxjs"',
			output: 'import * as Rx from "rxjs"',
			options: [{
				styles: {
					rxjs: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('rxjs')],
		},
		{
			code: 'const {Observable} = require("rxjs")',
			output: 'const Rx = require("rxjs")',
			options: [{
				styles: {
					rxjs: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('rxjs')],
		},
		{
			code: 'import {ref} from "vue"',
			output: 'import * as Vue from "vue"',
			options: [{
				styles: {
					vue: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('vue')],
		},
		{
			code: 'const {ref} = require("vue")',
			output: 'const Vue = require("vue")',
			options: [{
				styles: {
					vue: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('vue')],
		},
		{
			code: 'import {Component} from "angular"',
			output: 'import * as Angular from "angular"',
			options: [{
				styles: {
					angular: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('angular')],
		},
		{
			code: 'const {Component} = require("angular")',
			output: 'const Angular = require("angular")',
			options: [{
				styles: {
					angular: {
						namespace: true,
						named: false,
					},
				},
			}],
			errors: [getNamespaceError('angular')],
		},

		{
			code: outdent`
				import {useState, useEffect} from 'react';
				useState(0);
				useEffect(() => {});
			`,
			output: outdent`
				import * as React from 'react';
				React.useState(0);
				React.useEffect(() => {});
			`,
			options: [
				{
					styles: {
						react: {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('react')],
		},
		{
			code: outdent`
				const {map, filter} = require('lodash');
				map([1, 2, 3], x => x * 2);
				filter([1, 2, 3], x => x > 2);
			`,
			output: outdent`
				const _ = require('lodash');
				_.map([1, 2, 3], x => x * 2);
				_.filter([1, 2, 3], x => x > 2);
			`,
			options: [
				{
					styles: {
						lodash: {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('lodash')],
		},
		{
			code: outdent`
				import {render, hydrate} from 'react-dom';
				render(App(), document.body);
				hydrate(App(), document.body);
			`,
			output: outdent`
				import * as ReactDOM from 'react-dom';
				ReactDOM.render(App(), document.body);
				ReactDOM.hydrate(App(), document.body);
			`,
			options: [
				{
					styles: {
						"react-dom": {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('react-dom')],
		},
		{
			code: outdent`
				const {string, number, bool} = require('prop-types');
				Component.propTypes = {
					name: string,
					age: number,
					isActive: bool,
				};
			`,
			output: outdent`
				const PropTypes = require('prop-types');
				Component.propTypes = {
					name: PropTypes.string,
					age: PropTypes.number,
					isActive: PropTypes.bool,
				};
			`,
			options: [
				{
					styles: {
						"prop-types": {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('prop-types')],
		},
		{
			code: outdent`
				import {Route, Switch, useParams} from 'react-router';
				function App() {
					const params = useParams();
					return createElement('div', null,
						createElement(Switch, null,
							createElement(Route, { path: "/" })
						)
					);
				}
			`,
			output: outdent`
				import * as ReactRouter from 'react-router';
				function App() {
					const params = ReactRouter.useParams();
					return createElement('div', null,
						createElement(ReactRouter.Switch, null,
							createElement(ReactRouter.Route, { path: "/" })
						)
					);
				}
			`,
			options: [
				{
					styles: {
						"react-router": {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('react-router')],
		},
		{
			code: outdent`
				const React = 'not the real React';
				import {useState} from 'react';
				useState(0);
			`,
			output: outdent`
				const React = 'not the real React';
				import * as React_ from 'react';
				React_.useState(0);
			`,
			options: [
				{
					styles: {
						react: {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('react')],
		},
		{
			code: outdent`
				import {useState} from 'react';
				useState(0);
			`,
			output: outdent`
				import * as React from 'react';
				React.useState(0);
			`,
			options: [
				{
					styles: {
						react: {
							namespace: true,
							named: false,
						},
					},
				},
			],
			errors: [getNamespaceError('react')],
		},
	].map(test => addDefaultOptions(test)),
});

test.babel({
	valid: [
		'const {...rest2} = require("named")',
	],
	invalid: [
		{
			code: 'const {...rest2} = require("unassigned")',
			errors: [unassignedError],
		},
		{
			code: 'const {...rest2} = require("default")',
			errors: [defaultError],
		},
		{
			code: 'const {...rest2} = require("namespace")',
			output: 'const namespace = require("namespace")',
			errors: [getNamespaceError('namespace')],
		},
	].map(test => addDefaultOptions(test)),
});

test.snapshot({
	valid: [
		'let a',
	],
	invalid: [
		'import util from \'util\'',
		'import util from \'node:util\'',
		'import * as util from \'util\'',
		'import * as util from \'node:util\'',
		'const util = require(\'util\')',
		'const util = require(\'node:util\')',
		'require(\'util\')',
		'require(\'node:util\')',
		'import {red} from \'chalk\'',
		'import {red as green} from \'chalk\'',
		outdent`
			async () => {
				const {red} = await import('chalk');
			}
		`,
	],
});
