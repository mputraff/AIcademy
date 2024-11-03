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
          url: "https://aicademy-production.up.railway.app", // Gunakan environment variable
          description: "Production server",
        },
        {
          url: "http://localhost:3000", // Tambahkan localhost untuk development
          description: "Development server",
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
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AIcademy';
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
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