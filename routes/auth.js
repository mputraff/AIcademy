// routes/auth.js
import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = express.Router();
const upload = multer({
  limits: {
    fileSize: 1024 * 1024,
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

const tempUserStorage = {};
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Email already exists, use another email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(1000 + Math.random() * 9000);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    tempUserStorage[email] = { name, hashedPassword, otp, otpExpires };

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

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="background-color: #f7f7f7; padding: 20px; text-align: center;">
          <img src="https://res.cloudinary.com/dtonikyjm/image/upload/v1732362341/LogoAicademyPanjang.png" alt="Aicademy Logo" style="width: auto; height: 100px;">
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
          <p>Hi ${name},</p>
          <p>Tinggal selangkah lagi untuk menyelesaikan proses, mohon konfirmasi dengan memasukkan kode OTP di bawah ini.</p>
          <div style="text-align: center; font-size: 24px; font-weight: bold; padding: 20px; background-color: #f1f1f1; border-radius: 5px;">
            ${otp}
          </div>
          <p style="color: #666;">Kode ini hanya berlaku selama 10 menit. Jangan pernah membagikan kode OTP kepada siapa pun!</p>
          <p>Jika ada pertanyaan atau membutuhkan bantuan, silakan hubungi call center kami di +62 821-1723-6590 atau melalui email di <a href="cs@aicade.my.id" style="color: #1a73e8;">cs@aicade.my.id</a>.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to AIcademy",
      html: htmlContent,
    });

    res.status(201).json({
      status: "success",
      message: "Code otp successfully sent. Please check your email.",
    });
  } catch (error) {
    console.error("Error during registration:", error); // Menampilkan error di console log
    res.status(500).json({ error: error.message || "Error registering user" });
  }
});

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Retrieve all users
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: A list of users
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Error fetching users
 */
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.find(); // Ambil semua user dari database
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Error fetching users" });
  }
});

/**
 * @swagger
 * /api/auth/users/{id}:
 *   put:
 *     summary: Update user by ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
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
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Error updating user
 */
router.put("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error updating user" });
  }
});

/**
 * @swagger
 * /api/auth/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Error deleting user
 */
router.delete("/users/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Error deleting user" });
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
    if (email === "cs@aicade.my.id" && password === "aicademy") {
      const token = jwt.sign(
        { role: "admin", email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Token akan kedaluwarsa dalam 1 jam
      );

      return res.json({
        status: "success",
        message: "Admin logged in successfully",
        token,
      });
    }

    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        { id: user.id, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Token akan kedaluwarsa dalam 1 jam
      );

      res.json({
        status: "success",
        message: `User ${user.name} logged in successfully`,
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
 *       409:
 *         description: Email already exists, use another email
 */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Find the user by email
    const tempUser = tempUserStorage[email];

    if (!tempUser || tempUser.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP expired or invalid" });
    }

    if (
      tempUser.otp !== parseInt(otp, 10) ||
      tempUser.otpExpires < Date.now()
    ) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Email already exists, use another email" });
    }

    const user = new User({
      name: tempUser.name,
      email,
      password: tempUser.hashedPassword,
    });

    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({ error: "Error verifying OTP" });
  }
});

export default router;
