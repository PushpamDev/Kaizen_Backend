import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose"; 
import express from "express";
import session from "express-session";
import connectMongo from "connect-mongo"; // ✅ Added session store
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./models/UserModel.js";
import KaizenIdea from "./models/KaizenIdea.js";
import ApprovalWorkflow from "./models/ApprovalWorkflow.js";
import Category from "./models/CategoryModel.js";

dotenv.config();

// ✅ Register Mongoose Adapter Before AdminJS Initialization
AdminJS.registerAdapter(AdminJSMongoose);

// ✅ Initialize AdminJS
const adminJs = new AdminJS({
    databases: [mongoose],
    rootPath: "/admin",
    resources: [User, KaizenIdea, ApprovalWorkflow, Category],
});

// ✅ Fix Session Persistence with Mongo Store
const sessionStore = connectMongo.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions", 
});

const sessionOptions = {
    secret: process.env.ADMIN_COOKIE_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // ✅ Added Mongo Store
    cookie: { secure: process.env.NODE_ENV === "production" },
};

// ✅ Secure Authentication (Only Super Admins)
const authenticate = async (email, password) => {
    const user = await User.findOne({ email });
    
    if (!user) return null; // ❌ No User Found
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null; // ❌ Wrong Password

    if (user.role !== "super admin") return null; // ❌ Block Non-Super Admins
    
    return user; // ✅ Allow Super Admins
};

// ✅ Create Admin Router with Authentication
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
    authenticate,
    cookieName: "adminjs",
    cookiePassword: process.env.ADMIN_COOKIE_SECRET || "default_secret",
}, express.Router(), session(sessionOptions));

export { adminJs, adminRouter };
