import AdminJS, { ComponentLoader } from "adminjs"; // Import ComponentLoader
import AdminJSExpress from "@adminjs/express";
import * as AdminJSMongoose from "@adminjs/mongoose"; 
import express from "express";
import session from "express-session";
import connectMongo from "connect-mongo";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User, rolePermissions } from "./models/UserModel.js";
import KaizenIdea from "./models/KaizenIdea.js";
import ApprovalWorkflow from "./models/ApprovalWorkflow.js";
import Category from "./models/CategoryModel.js";
import OrganizationLogo from "./models/OrganizationLogo.js"; // Import OrganizationLogo Model

dotenv.config();

// Register Mongoose Adapter Before Importing Models
AdminJS.registerAdapter(AdminJSMongoose);

// Set up Component Loader
const componentLoader = new ComponentLoader();
const OrganizationLogoShow = componentLoader.add("OrganizationLogoShow", "./admin/components/OrganizationLogoShow");

const adminJs = new AdminJS({
    rootPath: "/admin",
    resources: [
        {
            resource: OrganizationLogo,
            options: {
                properties: {
                    logo: {
                        components: {
                            show: OrganizationLogoShow, // Register the custom component
                        },
                    },
                },
            },
        },
        KaizenIdea,
        ApprovalWorkflow,
        Category,
        {
            resource: User,
            options: {
                properties: {
                    password: { isVisible: false },
                    permissions: { isVisible: { list: true, edit: true, show: true } },
                },
                actions: {
                    edit: {
                        before: async (request) => {
                            if (request.payload.role) {
                                request.payload.permissions = rolePermissions[request.payload.role] || [];
                            }
                            return request;
                        },
                    },
                },
            },
        },
    ],
    componentLoader, //  Attach component loader to AdminJS
});

// Fix Session Persistence with Mongo Store
const sessionStore = connectMongo.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
});

const sessionOptions = {
    secret: process.env.ADMIN_COOKIE_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: process.env.NODE_ENV === "production" },
};

//  Secure Authentication
const authenticate = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    if (user.role !== "super admin") return null;

    return user;
};

//  Create Admin Router
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
