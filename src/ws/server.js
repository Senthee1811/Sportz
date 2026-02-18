import { WebSocket, WebSocketServer } from "ws";

function sendJSON(socket, payload) {
    if (socket.readyState != WebSocket.OPEN) return;
    
    socket.send(JSON.stringify(payload));
} 

function broadcast(wss,payload){
    for (const client of wss.clients) {
        if (client.readyState != WebSocket.OPEN) continue;
        client.send(JSON.stringify(payload));
        
    }
} 

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        maxPayload: 1024 * 1024,
    }); 

    const broadcastMatchCreated = (payload) => broadcast(wss,payload);

    // Handle new connections
    wss.on("connection", (socket) => {
        socket.isAlive = true;

        socket.on("pong", () => {
            socket.isAlive = true;
        });

        socket.on("error", (err) => {
            console.error("WebSocket error:", err);
        });

        sendJSON(socket, { type: "welcome" });
    });

    // Heartbeat interval (ping clients every 30s)
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                return ws.terminate();
            }
            if (ws.readyState !== WebSocket.OPEN) return; 

            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    // Cleanup on server close
    wss.on("close", () => {
        clearInterval(interval);
    });

    return { wss, broadcastMatchCreated };
}