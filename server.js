import express from "express";
import mongoose from "mongoose";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import * as dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

const baseUrl = process.env.BASE_URL || "http://localhost:8080";

// Konfigurasi Swagger
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
        url: baseUrl,
        description: "Current environment server",
      },
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
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use("/api/auth", authRoutes);

// MongoDB Connection (using Railway MongoDB URI)
const connectToMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }
    // Nonaktifkan sementara
    // await mongoose.connect(mongoURI, {
    //   serverSelectionTimeoutMS: 5000
    // });
    console.log('MongoDB connection skipped');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);  // Exit if cannot connect to MongoDB
  }
};

// Start server
const startServer = async () => {
  // Nonaktifkan sementara koneksi MongoDB
  // await connectToMongoDB();  

  const port = process.env.PORT || 8080; // Use 8080 as default
  app.listen(port, "0.0.0.0", () => {
    // Bind to 0.0.0.0
    console.log(`Server is running on port ${port}`);
  });
};

startServer();
