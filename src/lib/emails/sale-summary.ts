import { ItemStatus, OrderStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { sendEmail } from "../email";
import { getOwnerNotificationEmail } from "../owner-email";
import { getSaleEventStats } from "../sale-event-stats";
import { formatCurrency, formatDateOnly } from "../utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendSaleSummaryEmail(saleEventId: string): Promise<void> {
  const sale = await prisma.saleEvent.findUnique({ where: { id: saleEventId } });
  if (!sale || sale.summaryEmailSentAt) return;

  const ownerEmail = await getOwnerNotificationEmail();
  if (!ownerEmail) {
    console.warn("[Email] No owner notification email configured — skipping sale summary");
    return;
  }

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const shopName = settings?.shopName ?? "Consignment Shop";
  const stats = await getSaleEventStats(saleEventId);

  const paidLines = await prisma.orderItem.findMany({
    where: {
      item: { saleEventId },
      order: { status: OrderStatus.PAID },
    },
    include: {
      order: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { title: "asc" },
  });

  const pendingLines = await prisma.orderItem.findMany({
    where: {
      item: { saleEventId },
      order: { status: OrderStatus.PENDING },
    },
    include: {
      order: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { title: "asc" },
  });

  const unsoldItems = await prisma.item.findMany({
    where: {
      saleEventId,
      status: { not: ItemStatus.REMOVED },
    },
    select: { title: true, quantityAvailable: true, quantity: true, status: true },
    orderBy: { title: "asc" },
  });

  const unsoldAvailable = unsoldItems.filter(
    (item) => item.quantityAvailable > 0 && item.status !== ItemStatus.SOLD
  );

  const soldRowsText = paidLines.map((line) => {
    const buyer = line.order.user;
    const qty = line.quantity > 1 ? ` × ${line.quantity}` : "";
    return `- ${line.title}${qty} → ${buyer.name} (${buyer.email}) — ${formatCurrency(line.price * line.quantity)}`;
  });

  const pendingRowsText = pendingLines.map((line) => {
    const buyer = line.order.user;
    const qty = line.quantity > 1 ? ` × ${line.quantity}` : "";
    return `- ${line.title}${qty} → ${buyer.name} (${buyer.email}) — ${formatCurrency(line.price * line.quantity)} (unpaid)`;
  });

  const unsoldRowsText = unsoldAvailable.map(
    (item) => `- ${item.title} (${item.quantityAvailable} of ${item.quantity} available)`
  );

  const subject = `Sale summary: ${sale.title} — ${shopName}`;

  const text = [
    `${shopName} — sale ended`,
    "",
    `Sale: ${sale.title}`,
    `Ran: ${formatDateOnly(sale.startsAt)} through ${formatDateOnly(sale.endsAt)}`,
    "",
    "Summary",
    `- Total collected (paid): ${formatCurrency(stats.paidRevenue)}`,
    `- Outstanding (unpaid orders): ${formatCurrency(stats.pendingRevenue)}`,
    `- Units sold: ${stats.unitsSold} of ${stats.totalUnits}`,
    `- Paid orders: ${stats.paidOrderCount}`,
    `- Unpaid orders: ${stats.pendingOrderCount}`,
    `- Unique customers: ${stats.uniqueCustomers}`,
    `- Total bids placed: ${stats.bidCount}`,
    "",
    soldRowsText.length > 0 ? "Items sold (paid):" : "Items sold (paid): none",
    ...(soldRowsText.length > 0 ? soldRowsText : ["- (none)"]),
    "",
    pendingRowsText.length > 0 ? "Outstanding unpaid orders:" : "Outstanding unpaid orders: none",
    ...(pendingRowsText.length > 0 ? pendingRowsText : ["- (none)"]),
    "",
    unsoldRowsText.length > 0 ? "Unsold inventory still available:" : "Unsold inventory: none remaining",
    ...(unsoldRowsText.length > 0 ? unsoldRowsText : ["- (none)"]),
  ].join("\n");

  const soldRowsHtml = paidLines
    .map(
      (line) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.title)}${line.quantity > 1 ? ` × ${line.quantity}` : ""}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.order.user.name)}<br><span style="color:#64748b;font-size:13px;">${escapeHtml(line.order.user.email)}</span></td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(line.price * line.quantity)}</td>
        </tr>`
    )
    .join("");

  const pendingRowsHtml = pendingLines
    .map(
      (line) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.title)}${line.quantity > 1 ? ` × ${line.quantity}` : ""}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.order.user.name)}<br><span style="color:#64748b;font-size:13px;">${escapeHtml(line.order.user.email)}</span></td>
          <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;color:#b45309;">${formatCurrency(line.price * line.quantity)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5;max-width:640px;">
  <h1 style="font-size:22px;margin:0 0 4px;">Sale summary</h1>
  <p style="margin:0 0 16px;color:#475569;">${escapeHtml(shopName)} · ${escapeHtml(sale.title)}</p>
  <p style="margin:0 0 20px;color:#64748b;">${escapeHtml(formatDateOnly(sale.startsAt))} — ${escapeHtml(formatDateOnly(sale.endsAt))}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr><td style="padding:6px 0;">Total collected</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#15803d;">${formatCurrency(stats.paidRevenue)}</td></tr>
    <tr><td style="padding:6px 0;">Outstanding payments</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#b45309;">${formatCurrency(stats.pendingRevenue)}</td></tr>
    <tr><td style="padding:6px 0;">Units sold</td><td style="padding:6px 0;text-align:right;">${stats.unitsSold} / ${stats.totalUnits}</td></tr>
    <tr><td style="padding:6px 0;">Paid / unpaid orders</td><td style="padding:6px 0;text-align:right;">${stats.paidOrderCount} / ${stats.pendingOrderCount}</td></tr>
    <tr><td style="padding:6px 0;">Unique customers</td><td style="padding:6px 0;text-align:right;">${stats.uniqueCustomers}</td></tr>
    <tr><td style="padding:6px 0;">Bids placed</td><td style="padding:6px 0;text-align:right;">${stats.bidCount}</td></tr>
  </table>

  <h2 style="font-size:16px;margin:24px 0 8px;">Items sold (paid)</h2>
  ${
    soldRowsHtml
      ? `<table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;">Item</th>
      <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;">Customer</th>
      <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1;">Amount</th>
    </tr></thead>
    <tbody>${soldRowsHtml}</tbody>
  </table>`
      : `<p style="color:#64748b;">No paid sales.</p>`
  }

  ${
    pendingRowsHtml
      ? `<h2 style="font-size:16px;margin:24px 0 8px;">Outstanding unpaid orders</h2>
  <table style="width:100%;border-collapse:collapse;">
    <thead><tr>
      <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;">Item</th>
      <th style="text-align:left;padding:8px;border-bottom:2px solid #cbd5e1;">Customer</th>
      <th style="text-align:right;padding:8px;border-bottom:2px solid #cbd5e1;">Amount</th>
    </tr></thead>
    <tbody>${pendingRowsHtml}</tbody>
  </table>`
      : ""
  }

  ${
    unsoldAvailable.length > 0
      ? `<h2 style="font-size:16px;margin:24px 0 8px;">Unsold inventory (${unsoldAvailable.length} items)</h2>
  <ul style="margin:0;padding-left:20px;color:#475569;">
    ${unsoldAvailable.map((item) => `<li>${escapeHtml(item.title)} — ${item.quantityAvailable} of ${item.quantity} available</li>`).join("")}
  </ul>`
      : ""
  }
</body>
</html>`;

  try {
    await sendEmail({ to: ownerEmail, subject, text, html });
    await prisma.saleEvent.update({
      where: { id: saleEventId },
      data: { summaryEmailSentAt: new Date() },
    });
  } catch (err) {
    console.error("[Email] Failed to send sale summary:", err);
  }
}
