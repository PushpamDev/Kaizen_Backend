const mongoose = require("mongoose");

// ✅ Define Role Permissions
const rolePermissions = {
    "super admin": ["assign_admin", "assign_approver", "manage_all", "approve_kaizen", "reject_kaizen"],
    "admin": ["assign_approver", "approve_kaizen", "reject_kaizen"],
    "approver": ["approve_kaizen", "reject_kaizen"],
    "user": ["submit_kaizen", "view_kaizen_form"]
};

// ✅ Define User Schema
const userSchema = new mongoose.Schema(
    {
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
            trim: true
        },
        permissions: { 
            type: [String], 
            default: function () { return rolePermissions[this.role] || []; }
        },
        plantCode: { type: String, required: true, trim: true }
    }, 
    { timestamps: true }
);

// ✅ Ensure Unique Email in Each Plant
userSchema.index({ email: 1, plantCode: 1 }, { unique: true });

// ✅ Automatically Assign Permissions When Role Changes
userSchema.pre("save", function (next) {
    if (this.isModified("role")) {
        this.permissions = rolePermissions[this.role] || [];
    }
    next();
});

// ✅ Correctly Export User Model & rolePermissions Together
const User = mongoose.model("User", userSchema);

module.exports = { User, rolePermissions };
