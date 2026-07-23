import http from "node:http";
import { createExpressApplication } from "./app/app.js";
import { initSocket } from "./app/common/socket/socket.js";

async function main() {
  const server = http.createServer(createExpressApplication());
  const PORT = process.env.PORT ?? 8000;
  initSocket(server)

  server.listen(PORT, () =>
    console.log(`server is running on http://localhost:${PORT}`),
  );
}

main()