import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "AI Dashboard Backend API",
            version: "1.0.0",
            description: "API documentation for AI Dashboard backend (AI Jobs, Auth, Files, etc.)",
        },
        servers: [
            { url: "http://localhost:5001" },
        ],
    },
    apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app) {
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
