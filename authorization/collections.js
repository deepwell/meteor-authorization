/**
 * AuthItems
 *
 * Stores auth items including roles and permissions.
 */
(function() {
  'use strict';

  /**
   * AuthItems collection documents.
   */
  if (!Meteor.authItems) {
    Meteor.authItems = new Meteor.Collection('authItems', {
      transform: function(doc) {
        return new AuthItem(doc)
      }
    });
  }

}());
