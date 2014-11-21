'use strict';

var docReadyFactory = require('./doc-ready-factory');

var nonInjector = function (escapedCSS) {
  return 'module.exports = ' + escapedCSS;
};

var v8Injector = function (escapedCSS) {
  return 'var css = ' + escapedCSS + '; (require(' + JSON.stringify(__dirname) + '))(css); module.exports = css;';
};

var browserInjector = function (escapedCSS) {
  var docReadyFactoryFn = docReadyFactory.toString();
  var onDocReadyFn = 'function () {var css=' + escapedCSS + ';var node=document.createElement(\'style\');node.innerHTML=css;document.body.appendChild(node);module.exports=css;}';
  return '(' + docReadyFactoryFn + ')(\'sassifyDocReady\',window)(' + onDocReadyFn + ');';
};

module.exports = function (globalOptions) {
  if (!globalOptions) {
    return nonInjector;
  }

  if (!!(globalOptions['auto-inject'])) {
    return v8Injector;
  }

  if (!!(globalOptions.injection)) {
    switch (globalOptions.injection) {
      case 'v8':
        return v8Injector;
      case 'browser':
        return browserInjector;
      case 'none':
        return nonInjector;
      default:
        throw new Error('Sassify: Unexpected "injection" setting: ' + globalOptions.injection);
    }
  }

  return nonInjector;
};
