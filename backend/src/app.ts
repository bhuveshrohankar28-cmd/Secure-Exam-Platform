import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";
import rateLimit from "express-rate-limit";

// Initialize Firebase Admin SDK
import "./firebase/firebaseAdmin";

// Routes
import healthRoutes from "./routes/healthRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import testRoutes from "./routes/testRoutes";
import testAccessRoutes from "./routes/testAccessRoutes";
import attemptRoutes from "./routes/attemptRoutes";
import adminRoutes from "./routes/adminRoutes";
import violationRoutes from "./routes/violationRoutes";

const app: Application = express();

// ------------------------------------------------------------------
// Security Middleware
// ------------------------------------------------------------------
app.use(helmet());

// ------------------------------------------------------------------
// CORS
// ------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL ?? "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, Next.js server rewrites)
      // and allow LAN mobile connections during development
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' not allowed.`));
      }
    },
    credentials: true,
  })
);

// ------------------------------------------------------------------
// Body Parsing
// ------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// Rate limiting
// Login can create accounts, so limit it. The limit is per IP and a hall of
// phones on one router shares one IP, so keep it generous.
// ------------------------------------------------------------------
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many login attempts. Please wait a minute." },
  })
);

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/test-access", testAccessRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/violations", violationRoutes);

// ------------------------------------------------------------------
// 404 Handler
// ------------------------------------------------------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route '${req.method} ${req.path}' not found.`,
  });
});

export default app;