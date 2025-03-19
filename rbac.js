const AccessControl = require("accesscontrol");

const ac = new AccessControl();

ac.grant("normal_user")  // Match role names with JWT
    .readOwn("profile")
    .createOwn("form");

ac.grant("approver")
    .extend("normal_user")
    .updateAny("kaizen")
    .readAny("kaizen");

ac.grant("admin")
    .extend("approver")
    .readAny("profile")  // <-- Add this line to allow admin to read profiles
    .updateAny("profile")
    .createAny("approver");

ac.grant("super_admin")
    .extend("admin")
    .createAny("admin")
    .deleteAny("profile");

module.exports = ac;
