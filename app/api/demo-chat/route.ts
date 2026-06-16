import { demoEvents } from "@/lib/demo-chat/events";

export async function POST() {
  return Response.json({ events: demoEvents });
}
