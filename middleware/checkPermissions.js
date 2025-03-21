const ac = require("../rbac");

const checkPermission = (action, resource) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            console.log("❌ Unauthorized: No role found in request");
            return res.status(401).json({ success: false, message: "Unauthorized: No role found" });
        }

        const role = req.user.role.toLowerCase(); // Normalize role
        console.log(`🔍 Checking permission for Role: ${role}, Action: ${action}, Resource: ${resource}`);

        // Ensure RBAC permissions exist for the role
        if (!ac.can(role)) {
            console.log(`⚠️ Role '${role}' is not defined in RBAC`);
            return res.status(403).json({ success: false, message: "Access denied: Role not recognized" });
        }

        // Ensure the action exists to avoid errors
        if (typeof ac.can(role)[action] !== "function") {
            console.log(`⚠️ Invalid action '${action}' for role '${role}' in RBAC`);
            return res.status(403).json({ success: false, message: "Access denied: Invalid action" });
        }

        const permission = ac.can(role)[action](resource);

        console.log(`🔑 Permission granted: ${permission.granted}`);

        if (!permission.granted) {
            console.log(`❌ Access denied for role '${role}' to perform '${action}' on '${resource}'`);
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        next();
    };
};

module.exports = checkPermission;
