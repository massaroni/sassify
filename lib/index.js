"use strict";

var sass = require("node-sass");
var through = require("through2");
var path = require("path");
var extend = require('util')._extend;
var cssmin = require('cssmin');
var moduleBodyFactoryFactory = require('./module-body-factory');

var escapeCssOctalLiterals = function (moduleBodyJs) {
  return moduleBodyJs.replace(/\\(\d)/g, function (match, digit) {
    return '\\\\' + digit;
  });
};

var parseBrowserifyInput = function (bufferedInputString) {
  var escaped = escapeCssOctalLiterals(bufferedInputString);
  var module = {};

  eval(escaped);

  return module.exports;
};

var isPlainCssFile = function (fileName) {
  return /(\.css)$/i.test(fileName);
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
        console.log('Sassify failed reading input chunk for file ' + fileName, e);
      }
    },
    function (done) {
      var options, self;

      self = this;

      // new copy of globalOptions for each file
      options = extend({}, globalOptions || {});
      options.includePaths = extend([], (globalOptions ? globalOptions.includePaths : {}) || []);

      var scssInput = parseBrowserifyInput(buffer);
      options.data = scssInput;
      options.includePaths.unshift(path.dirname(fileName));
      var emitCss = function (css) {
        var postProcessedCSS = minifyCss ? cssmin(css) : css;
        var escapedCSS = JSON.stringify(postProcessedCSS);

        var moduleBody = moduleBodyFactory(escapedCSS);

        self.push(moduleBody);
        self.push(null);
      };

      try {
        if (isPlainCssFile(fileName)) {
          emitCss(scssInput);
        } else {
          var css = sass.renderSync(options);
          emitCss(css);
        }
      } catch (error) {
        console.log('Sassify error processing file ' + fileName, error);
        throw error;
      }
    }
  );
};