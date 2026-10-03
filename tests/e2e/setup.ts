import "dotenv/config";
import { resetTestDatabase } from "../helpers/database";
export default async function setup() {
  await resetTestDatabase();
}
