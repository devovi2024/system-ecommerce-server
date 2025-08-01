import express from "express";
import {
  login,
  logout,
  refreshToken,
  signup,
  getProfile,
  updateProfile
} from "../controller/auth.controller.js";

import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refreshToken", refreshToken);
router.get("/profile", protectRoute, getProfile); 
router.put("/profile", protectRoute, updateProfile);
export default router;
