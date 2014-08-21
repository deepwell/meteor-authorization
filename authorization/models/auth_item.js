/**
 * AuthItem model
 */

AuthItem = {};

(function() {
  'use strict';

  AuthItem = function AuthItem(doc) {
    _.extend(this, doc);
  };

  /**
   * Add this auth item as a child of another auth item.
   *
   * @param childName  AuthItem or permission
   */
  AuthItem.prototype.addChild = function(childName) {
    AuthManager.addItemChild(this.name, childName);
  };

}());
