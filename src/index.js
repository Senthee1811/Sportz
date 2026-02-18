import express from "express"; 
import { matchRouter } from "./routes/matches.js";
import http from "http";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from '../arcjet.js'

const  app = express(); 
const server = http.createServer(app);

const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());

app.get("/",(req,res) => {
    res.send("Helo World");
}); 

app.use(securityMiddleware());
app.use("/matches", matchRouter);
const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen( PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`
    console.log(`Server is running on ${baseUrl}`);
    console.log(`WebSocket Server is running on ${baseUrl.replace('http', 'ws')}/ws`);
});