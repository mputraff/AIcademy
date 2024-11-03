import express from "express";
import mongoose from "mongoose";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import * as dotenv from 'dotenv';
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(express.json());

// Konfigurasi Swagger untuk Railway
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth API Documentation",
      version: "1.0.0",
      description: "API Documentation for Authentication Service",
    },
    servers: [
      {
        url: "https://your-api-name.up.railway.app", // Ganti dengan URL Railway Anda
        description: "Production server",
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use("/api/auth", authRoutes);

// MongoDB Connection (menggunakan Railway MongoDB URI)
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectToMongoDB();
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer();