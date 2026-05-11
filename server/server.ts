import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import userRoutes from "./routes/userRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import { stripeWebhook } from "./controllers/stripeWebhook.js";

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const allowedOrigins = [
    "http://localhost:5173",
    "https://webynix.vercel.app",
    ...(process.env.TRUSTED_ORIGINS?.split(",") || [])
];

const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
}

app.use(cors(corsOptions))
app.post("/api/stripe", express.raw({ type: "application/json" }), stripeWebhook)

app.all('/api/auth/{*any}', toNodeHandler(auth));

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use("/api/user", userRoutes);

app.use("/api/project", projectRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});