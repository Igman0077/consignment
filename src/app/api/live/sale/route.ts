import { getShopSaleStatus } from "@/lib/sale-events";
import { liveInventoryHub } from "@/lib/live-inventory";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const saleId = searchParams.get("saleId");

  if (!saleId) {
    return new Response("Missing saleId", { status: 400 });
  }

  const saleStatus = await getShopSaleStatus();
  if (!saleStatus.activeSale || saleStatus.activeSale.id !== saleId) {
    return new Response("Sale is not active", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: "connected", saleId });

      const unsubscribe = liveInventoryHub.subscribe(saleId, (update) => {
        send(update);
      });

      const heartbeat = setInterval(() => {
        send({ type: "ping" });
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
