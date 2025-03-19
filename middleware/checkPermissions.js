const ac = require("../rbac");

const checkPermission = (action, resource) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            console.log("❌ Unauthorized: No role found in request");
            return res.status(401).json({ success: false, message: "Unauthorized: No role found" });
        }

        const role = req.user.role.toLowerCase(); // Ensure role is in lowercase
        console.log(`🔍 Checking permission for Role: ${role}, Action: ${action}, Resource: ${resource}`);

        const permission = ac.can(role)[action](resource);

        console.log(`🔑 Permission granted: ${permission.granted}`);

        if (!permission.granted) {
            console.log("❌ Access denied:", role, "=>", action, resource);
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        next();
    };
};

module.exports = checkPermission;
