(function() {
  'use strict';

  // Create default indexes for authItems collection
  Meteor.authItems._ensureIndex('name', { unique: 1 });

}());
