/*eslint-env node*/
'use strict';

var common = require('gulp-capacitorjs-common');
common.config.src.out = 'panel-helpers.js';
common.config.src.main = 'src/panel-helpers.js';
common.registerCommon();
