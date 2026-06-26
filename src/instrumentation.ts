export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapDatabase } = await import("@/lib/bootstrap-database");
    await bootstrapDatabase();
  }
}
