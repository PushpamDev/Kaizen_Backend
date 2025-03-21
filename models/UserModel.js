const mongoose = require("mongoose");

const rolePermissions = {
    "super admin": ["assign_admin", "assign_approver", "manage_all", "approve_kaizen", "reject_kaizen"],
    "admin": ["assign_approver", "approve_kaizen", "reject_kaizen"],
    "approver": ["approve_kaizen", "reject_kaizen"],
    "user": ["submit_kaizen", "view_kaizen_form"]
};

// User schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { 
        type: String, 
        required: true, 
        trim: true, 
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: Object.keys(rolePermissions),
        required: true,
        lowercase: true,
        trim: true
    },
    permissions: { 
        type: [String], 
        default: function () { return rolePermissions[this.role] || []; }
    },
    plantCode: { type: String, required: true, trim: true }
}, { timestamps: true });

userSchema.index({ email: 1, plantCode: 1 }, { unique: true });

userSchema.pre("save", function (next) {
    if (this.isModified("role")) {
        this.permissions = rolePermissions[this.role] || [];
    }
    next();
});

// ✅ Export the User model normally for AdminJS
const User = mongoose.model("User", userSchema);
module.exports = User;

// ✅ Export rolePermissions separately to avoid conflicts
module.exports.rolePermissions = rolePermissions;
