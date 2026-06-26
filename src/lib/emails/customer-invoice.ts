import { prisma } from "../prisma";
import { sendEmail } from "../email";
import { formatCurrency, formatDate } from "../utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendCustomerInvoiceEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true } },
      items: { orderBy: { title: "asc" } },
    },
  });

  if (!order || order.status !== "PAID" || order.invoiceEmailSentAt) return;
  if (!order.user.email) return;

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const shopName = settings?.shopName ?? "Consignment Shop";
  const paidAt = order.paidAt ? formatDate(order.paidAt) : formatDate(order.updatedAt);

  const lineRows = order.items.map((line) => {
    const lineTotal = line.price * line.quantity;
    const qtyLabel = line.quantity > 1 ? ` × ${line.quantity}` : "";
    return {
      text: `- ${line.title}${qtyLabel}: ${formatCurrency(lineTotal)}`,
      html: `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(line.title)}${line.quantity > 1 ? ` × ${line.quantity}` : ""}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(lineTotal)}</td>
      </tr>`,
    };
  });

  const pickup = settings?.pickupInstructions?.trim();
  const subject = `Your receipt from ${shopName} — Order #${order.id.slice(-8).toUpperCase()}`;

  const text = [
    `Hi ${order.user.name},`,
    "",
    `Thank you for your purchase at ${shopName}! Payment was confirmed on ${paidAt}.`,
    "",
    "Items purchased:",
    ...lineRows.map((row) => row.text),
    "",
    `Total: ${formatCurrency(order.total)}`,
    "",
    pickup ? `Pickup instructions:\n${pickup}` : "",
    "",
    "Keep this email for your records. If you have questions, reply to this message.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5;max-width:560px;">
  <h1 style="font-size:20px;margin:0 0 8px;">Payment confirmed</h1>
  <p style="margin:0 0 16px;">Hi ${escapeHtml(order.user.name)}, thank you for shopping at <strong>${escapeHtml(shopName)}</strong>.</p>
  <p style="margin:0 0 16px;color:#475569;">Paid on ${escapeHtml(paidAt)} · Order #${order.id.slice(-8).toUpperCase()}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px 0;border-bottom:2px solid #cbd5e1;">Item</th>
        <th style="text-align:right;padding:8px 0;border-bottom:2px solid #cbd5e1;">Amount</th>
      </tr>
    </thead>
    <tbody>${lineRows.map((row) => row.html).join("")}</tbody>
    <tfoot>
      <tr>
        <td style="padding:12px 0;font-weight:bold;">Total</td>
        <td style="padding:12px 0;font-weight:bold;text-align:right;color:#1d4ed8;">${formatCurrency(order.total)}</td>
      </tr>
    </tfoot>
  </table>
  ${
    pickup
      ? `<div style="background:#f8fafc;border-radius:8px;padding:16px;margin-top:16px;">
    <p style="margin:0 0 4px;font-weight:600;">Pickup instructions</p>
    <p style="margin:0;white-space:pre-wrap;">${escapeHtml(pickup)}</p>
  </div>`
      : ""
  }
  <p style="margin:24px 0 0;color:#64748b;font-size:14px;">Please keep this email for your records.</p>
</body>
</html>`;

  try {
    await sendEmail({ to: order.user.email, subject, text, html });
    await prisma.order.update({
      where: { id: orderId },
      data: { invoiceEmailSentAt: new Date() },
    });
  } catch (err) {
    console.error("[Email] Failed to send customer invoice:", err);
  }
}
