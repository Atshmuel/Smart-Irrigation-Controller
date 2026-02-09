import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('.env') });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initMqtt } from './mqtt/mqttClient.js';
import { potsRouter } from './routers/potsRouter.js';

const { SERVER_PORT } = process.env

const app = express();
app.use(
    cors({
        origin: [
            "http://localhost:5173"
        ],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", false);
app.use("/api/pots", potsRouter);

const main = async () => {
    try {
        // initMqtt();
        console.log(`Server running on http://localhost:${SERVER_PORT}`)
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};
main();
