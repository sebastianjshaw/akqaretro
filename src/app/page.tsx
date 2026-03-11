import { auth } from "@/auth";
import { HomeClient } from "@/components/landing/HomeClient";

export default async function Home() {
  const session = await auth();
  return <HomeClient session={session} />;
}
