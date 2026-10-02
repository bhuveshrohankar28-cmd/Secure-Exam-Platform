import { Router } from "express";
import { login, logout, getMe } from "../controllers/authController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/logout
router.post("/logout", verifyToken, logout);

// GET /api/auth/me  — requires a valid token
router.get("/me", verifyToken, getMe);

export default router;