// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import authenticateToken from "../middleware/authenticateToken.js";

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
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await user.save();

    const transporter = nodemailer.createTransport({
      host: "mail.aicade.my.id",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.PASS_USER,
      },
      debug: true, // Add this line for detailed logging
      logger: true,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to AIcademy",
      text: `Hi ${name}, welcome to AIcademy!. Your otp is ${user.otp}`,
    });

    res.status(201).json({
      status: "success",
      message:
        "User registered successfully and your otp successfully sent. Please check your email.",
      data: {
        id: user._id, // Mengakses _id setelah user disimpan
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
          id: user._id,
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
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        console.log("user tidak ditemukan");
        return res.status(404).json({ error: "User not found" });
      }
      console.log("User ditemukan", user);

      // Update nama, email, dan password jika diberikan
      if (name) user.name = name;
      if (email) user.email = email;
      if (password) user.password = await bcrypt.hash(password, 10);

      // Jika ada file foto profil, simpan ke database
      if (req.file) {
        user.profilePicture = req.file.buffer;
        console.log("Foto profil diperbarui.");
      }

      await user.save();
      console.log("Profil user berhasil diperbarui.");
      res.json({ message: "User profile updated successfully" });
    } catch (error) {
      console.log("Error saat memperbarui .", error);
      res.status(500).json({ error: "Error updating profile" });
    }
  }
);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for user registration
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
 *               otp:
 *                 type: number
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Check if OTP matches and is still valid
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Mark the user as verified
    user.isVerified = true;
    user.otp = undefined; // Clear OTP
    user.otpExpires = undefined; // Clear OTP expiry
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ error: "Error verifying OTP" });
  }
});

export default router;
