"use strict";

var sass = require("node-sass");
var through = require("through2");
var path = require("path");
var extend = require('util')._extend;
var cssmin = require('cssmin');
var moduleBodyFactoryFactory = require('./module-body-factory');

var parseBrowserifyInput = function (bufferedInputString) {
  var module = {};

  eval(bufferedInputString);

  return module.exports;
};

module.exports = function (fileName, globalOptions) {
  if (!/(\.scss|\.css)$/i.test(fileName)) {
    return through();
  }

  var minifyCss = !!globalOptions && !!(globalOptions.minify);
  var moduleBodyFactory = moduleBodyFactoryFactory(globalOptions);
  var buffer = "";

  return through(
    function (chunk, enc, next) {
      try {
        buffer += chunk.toString('utf8');
        next();
      } catch (e) {
        console.log('Sassify failed reading input chunk.', e);
      }
    },
    function (done) {
      var options, css, moduleBody, self;

      self = this;

      // new copy of globalOptions for each file
      options = extend({}, globalOptions || {});
      options.includePaths = extend([], (globalOptions ? globalOptions.includePaths : {}) || []);

      options.data = parseBrowserifyInput(buffer);
      options.includePaths.unshift(path.dirname(fileName));
      var emitCss = function (css) {
        var postProcessedCSS = minifyCss ? cssmin(css) : css;
        var escapedCSS = JSON.stringify(postProcessedCSS);

        moduleBody = moduleBodyFactory(escapedCSS);

        self.push(moduleBody);
        self.push(null);
      };

      try {
        var css = sass.renderSync(options);
        emitCss(css);
      } catch (error) {
        console.log('Sassify error.', error);
        throw error;
      }
    }
  );
};