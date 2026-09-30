import { Router } from "express";
import { getMyProfile, heartbeat } from "../controllers/userController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// All user routes require authentication
router.use(verifyToken);

// GET /api/users/me
router.get("/me", getMyProfile);

// POST /api/users/heartbeat
router.post("/heartbeat", heartbeat);

export default router;
