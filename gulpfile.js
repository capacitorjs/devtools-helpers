/*eslint-env node*/
'use strict';

var common = require('gulp-capacitorjs-common');
common.config.src.out = 'devtools-helpers.js';
common.config.src.main = 'src/devtools-helpers.js';
common.registerCommon();
