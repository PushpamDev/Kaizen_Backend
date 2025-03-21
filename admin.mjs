import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose"; 

import express from "express";
import session from "express-session";
import connectMongo from "connect-mongo"; // ✅ Mongo session store
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { User, rolePermissions } from "./models/UserModel.js"; // ✅ Import User & rolePermissions
import KaizenIdea from "./models/KaizenIdea.js";
import ApprovalWorkflow from "./models/ApprovalWorkflow.js";
import Category from "./models/CategoryModel.js";

dotenv.config();

// ✅ Register Mongoose Adapter Before Importing Models
AdminJS.registerAdapter(AdminJSMongoose);

// ✅ Initialize AdminJS
const adminJs = new AdminJS({
    rootPath: "/admin",
    resources: [
        {
            resource: User,
            options: {
                properties: {
                    password: { isVisible: false }, // Hide passwords
                    permissions: { isVisible: { list: true, edit: true, show: true } }
                },
                actions: {
                    edit: {
                        before: async (request) => {
                            if (request.payload.role) {
                                request.payload.permissions = rolePermissions[request.payload.role] || [];
                            }
                            return request;
                        }
                    }
                }
            }
        },
        KaizenIdea,
        ApprovalWorkflow,
        Category
    ],
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
    store: sessionStore, // ✅ Mongo Store for Sessions
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
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    adminJs,
    {
        authenticate,
        cookieName: "adminjs",
        cookiePassword: process.env.ADMIN_COOKIE_SECRET || "default_secret",
    },
    express.Router(),
    session(sessionOptions)
);

export { adminJs, adminRouter };
