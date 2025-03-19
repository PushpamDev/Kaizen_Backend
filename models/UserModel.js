const mongoose = require("mongoose");

// Define roles and their corresponding default permissions
const rolePermissions = {
    "super admin": ["assign_admin", "assign_approver", "manage_all", "approve_kaizen", "reject_kaizen"],
    "admin": ["assign_approver", "approve_kaizen", "reject_kaizen"],
    "approver": ["approve_kaizen", "reject_kaizen"],
    "user": ["submit_kaizen", "view_kaizen_form"]
};

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: Object.keys(rolePermissions), // Use defined roles dynamically
        required: true 
    },
    permissions: { 
        type: [String], 
        default: function () { return rolePermissions[this.role] || []; } // Assign default permissions
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
