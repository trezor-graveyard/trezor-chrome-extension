/*global angular*/

angular.module('webwalletApp')
  .filter('password', function () {
    'use strict';
    return function(s) {
      return s.replace(/./, '*');
    };
  });
