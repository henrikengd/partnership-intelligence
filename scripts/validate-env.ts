import "dotenv/config";
import { readConfig } from "../src/server/config";
readConfig();
console.log("Required server configuration is valid.");
