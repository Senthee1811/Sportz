import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../../arcjet.js";

/**
 * Send a JSON-serializable payload over an open WebSocket.
 * @param {WebSocket} socket - The WebSocket to send the payload on; no action is taken if the socket is not open.
 * @param {*} payload - The value to JSON-stringify and send to the socket.
 */
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

/**
 * Attach a WebSocket server to an existing HTTP server and expose the server instance and a broadcast helper.
 *
 * Creates a WebSocketServer mounted at path "/ws" with a 1 MB payload limit, performs an optional Arcjet-based
 * protection check on new connections (denied connections are closed with code 1013 for rate limiting or 1008 for access denial;
 * Arcjet errors close with code 1011), sends a welcome payload on successful connection, and maintains a heartbeat that
 * pings clients every 30 seconds and terminates unresponsive sockets. Cleans up the heartbeat when the WebSocket server closes.
 *
 * @param {import('http').Server} server - HTTP server to bind the WebSocket server to.
 * @returns {{ wss: import('ws').WebSocketServer, broadcastMatchCreated: (payload: any) => void }}
 *          An object containing the WebSocketServer instance (`wss`) and `broadcastMatchCreated`, a function that broadcasts
 *          a JSON-serializable payload to all connected clients.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        maxPayload: 1024 * 1024,
    }); 

    const broadcastMatchCreated = (payload) => broadcast(wss,payload);

    // Handle new connections
    wss.on("connection", async (socket, req) => {

        if(wsArcjet){
            try {
                const decision = await wsArcjet.protect(req);
                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008; 
                    const reason = decision.reason.isRateLimit() ? 'Rate Limit Exceeded' : 'Access Denied';
                    socket.close(code,reason); 
                    return;
                }
            } catch (error) {
                console.error("WS Arcjet error:", error);
                socket.close(1011, "Server security error");
                return;
            }
            
        }
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