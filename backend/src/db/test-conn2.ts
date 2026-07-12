import "dotenv/config";
import postgres from "postgres";
import * as dns from "node:dns";

const url = process.env.DATABASE_URL || "";
console.log("URL:", url.substring(0, 50) + "...");

// Resolve hostname
const hostname = url.split("@")[1]?.split(":")[0];
console.log("Hostname:", hostname);

dns.lookup(hostname, { all: true, family: 0 }, (err, addrs) => {
  if (err) console.error("DNS error:", err);
  else console.log("Resolved:", addrs);
});
