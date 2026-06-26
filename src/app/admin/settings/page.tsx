import { requireOwner, getShopSettings } from "@/lib/session";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Shop Settings" };

export default async function AdminSettingsPage() {
  await requireOwner();
  const settings = await getShopSettings();

  return <SettingsForm settings={settings} />;
}
