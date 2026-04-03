import { auth } from "@/auth";

export async function requireSessionIdentity() {
  const session = await auth();

  const userId = session?.user?.id?.trim();
  const username = session?.user?.name?.trim();

  if (!userId || !username) {
    throw new Error("Unauthorized");
  }

  return { userId, username };
}
