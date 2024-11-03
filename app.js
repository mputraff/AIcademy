import express from "express";
import mongoose from "mongoose";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import * as dotenv from 'dotenv';
import authRoutes from "./routes/auth.js";
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });
  
  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
  });

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

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
      const mongoURI = process.env.MONGODB_URI;
      // Hapus options yang deprecated
      await mongoose.connect(mongoURI);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
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