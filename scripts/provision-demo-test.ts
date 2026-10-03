import "dotenv/config";
import { provisionDemoTestDatabase } from "../tests/helpers/provision-demo";
await provisionDemoTestDatabase();
console.log(
  "Isolated pi_demo companion provisioned and migrated. No live installation was modified.",
);
