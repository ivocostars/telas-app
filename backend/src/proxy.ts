import http from "node:http";
import httpProxy from "http-proxy";

const proxy = httpProxy.createProxyServer({ changeOrigin: true });
const PORT = Number(process.env.PROXY_PORT) || 16728;

http.createServer((req, res) => {
  const target = req.url?.startsWith("/api")
    ? "http://localhost:4001"
    : "http://localhost:5174";

  proxy.web(req, res, { target }, (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502);
    res.end("Bad Gateway");
  });
}).listen(PORT, () => {
  console.log(`Unified proxy running on http://localhost:${PORT}`);
  console.log(`  /api/* -> backend :4001`);
  console.log(`  /*     -> admin   :5174`);
});
