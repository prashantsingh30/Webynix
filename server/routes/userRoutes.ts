import express from "express";
import { createUserProject, getUserCredits, getUserProject, getUserProjects, purchaseCredits, togglePublish } from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";

const userRoutes = express.Router();

userRoutes.get("/credits", protect, getUserCredits);
userRoutes.post("/project", protect, createUserProject);
userRoutes.get("/project/:projectId", protect, getUserProject);
userRoutes.get("/projects", protect, getUserProjects);
userRoutes.post("/purchase-credits", protect, purchaseCredits);
userRoutes.put("/publish-toggle/:projectId", protect, togglePublish);

export default userRoutes;