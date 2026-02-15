import { getSession } from "@/lib/auth";
import { Dock } from "./dock";

export async function DockProvider() {
  const session = await getSession();
  const isLoggedIn = !!session?.user?.id;

  return <Dock isLoggedIn={isLoggedIn} />;
}
