import express from "express";
import multer from "multer"; // For handling file uploads
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  translatePDF,
} from "../controllers/message.controller.js"; // Import the new translatePDF function

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

// Get users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);

// Get messages for a chat
router.get("/:id", protectRoute, getMessages);

// Send a message (text or voice)
router.post("/send/:id", protectRoute, sendMessage);

// Translate a PDF
router.post("/translate-pdf", protectRoute, upload.single("pdf"), translatePDF);

export default router;