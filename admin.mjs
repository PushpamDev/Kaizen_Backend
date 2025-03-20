import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose"; // ✅ Correct import
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./models/UserModel.js";
import KaizenIdea from "./models/KaizenIdea.js";
import ApprovalWorkflow from "./models/ApprovalWorkflow.js";
import Category from "./models/CategoryModel.js";

dotenv.config();

AdminJS.registerAdapter(AdminJSMongoose); // ✅ Register the adapter correctly

const adminJs = new AdminJS({
    databases: [mongoose],
    rootPath: "/admin",
    resources: [User, KaizenIdea, ApprovalWorkflow, Category],
});

// ✅ Fix express-session warnings
const sessionOptions = {
    secret: process.env.ADMIN_COOKIE_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
};

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
    authenticate: async (email, password) => {
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            return user;
        }
        return null;
    },
    cookieName: "adminjs",
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || "default_secret",
}, express.Router(), session(sessionOptions));

export { adminJs, adminRouter };
