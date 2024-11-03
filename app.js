import express from "express";
import mongoose from "mongoose";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.js";

const app = express();
app.use(express.json());

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Auth API",
      version: "1.0.0",
      description: "API for user registration and login",
    },
  },
  apis: ["./routes/auth.js"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use("/api/auth", authRoutes);

// Fungsi untuk koneksi MongoDB dengan penanganan error
const connectToMongoDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/AIcademy");
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); // Keluar dari proses jika koneksi gagal
  }
};

// Menangani event disconnect
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// Menangani event error
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Memulai server setelah berhasil terhubung ke MongoDB
const startServer = async () => {
  await connectToMongoDB();

  app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
};

startServer();
