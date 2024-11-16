import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: Number },
  otpExpires: { type: Date },
  role: { type: String, default: "user" }, // Default role is "user"
});

export default mongoose.model("User", userSchema);
