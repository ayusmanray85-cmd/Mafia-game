import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerSocketHandlers } from "./lib/socketHandlers.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/api/socket.io",
});

registerSocketHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
