// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authenticateToken from "../middleware/authenticateToken.js";
import { nanoid } from "nanoid";

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 1024 * 1024 * 5,
  },

  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Please upload an image file"));
    }
    cb(null, true);
  },
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       500:
 *         description: Error registering user
 */
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      id: nanoid(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString(),
    });

    await user.save();
    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error); // Menampilkan error di console log
    res.status(500).json({ error: "Error registering user" });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Error logging in
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { id: user.id, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Token akan kedaluwarsa dalam 1 jam
      );

      res.json({
        status: "success",
        message: "Login successfully",
        token,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          createdAt: user.createdAt,
          updateAt: user.updateAt,
        },
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});

/**
 * @swagger
 * /api/auth/edit-profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Error updating profile
 */
router.patch(
  "/edit-profile",
  authenticateToken,
  upload.single("profilePicture"),
  async (req, res) => {
    const { name, email, password } = req.body;
    const userId = req.user.id; // Sesuaikan dengan sistem autentikasi Anda
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update nama, email, dan password jika diberikan
      if (name) user.name = name;
      if (email) user.email = email;
      if (password) user.password = await bcrypt.hash(password, 10);

      // Jika ada file foto profil, simpan ke database
      if (req.file) {
        user.profilePicture = req.file.buffer;
      }

      await user.save();
      res.json({ message: "User profile updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error updating profile" });
    }
  }
);

export default router;
