(function() {
  'use strict';

  /**
   * Server only publications.
   */

  /**
   * Always publish logged-in user's roles so client-side
   * checks can work.
   */
  Meteor.publish(null, function() {
    var userId = this.userId,
        fields = { authItems:1 };

    return Meteor.users.find({ _id: userId }, { fields: fields });
  })

  /**
   * Make AuthItems available on the client.
   */
  Meteor.publish('authItems', function() {
    // defines the auth items available, does not leak private data
    return Meteor.authItems.find();
  });

}());
