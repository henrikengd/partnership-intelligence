import { redirect } from "next/navigation";
import { requireActor } from "./access";
import { DomainError } from "../errors";
export async function requirePageActor(headers: Headers) {
  try {
    return await requireActor(headers);
  } catch (error) {
    if (error instanceof DomainError && error.status === 401)
      redirect("/login");
    throw error;
  }
}
