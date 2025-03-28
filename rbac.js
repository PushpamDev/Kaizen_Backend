const AccessControl = require("accesscontrol");

const ac = new AccessControl();

ac.grant("user")  // Match role names with JWT
    .readOwn("profile")
    .createOwn("form");

ac.grant("approver")
    .extend("user")
    .updateAny("kaizen")
    .readAny("kaizen");
    
    ac.grant("admin")
    .extend("approver")
    .readAny("profile")
    .updateAny("profile")
    .createAny("approver")
    .updateAny("uploadSettings");
    
ac.grant("super admin")
    .extend("admin")
    .createAny("admin")
    .deleteAny("profile");

module.exports = ac;
