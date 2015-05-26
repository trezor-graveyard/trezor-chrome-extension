'use strict';

angular.module('webwalletApp').constant('config', {
  // show debug information in the interface
  debug: false,

  // minimal versions of firmare supporting given feature
  // use version string or false for disabling everywhere
  features: {
    getFeatures: '1.3.3',
    cacheInFeatures: '1.3.3'
  },

  // address of the bridge configuration file
  configUrl: '/data/config_signed.bin',


  // ID of the extension, given by chrome web store
  // Make sure to replicate this in the index.html <head> element!
  extensionId: "jcjjhjgimijdkoamemaghajlhegmoclj",

  useBip44: true

});
