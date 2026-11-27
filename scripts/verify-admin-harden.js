/** Quick public checks after admin harden. */
async function main() {
  const robots = await fetch("https://granit-karel.ru/robots.txt").then((r) => r.text());
  console.log("=== robots.txt ===");
  console.log(robots.trim());

  const admin = await fetch("https://granit-karel.ru/admin/", { method: "HEAD", redirect: "manual" });
  console.log("\n=== /admin/ ===");
  console.log(admin.status, {
    robots: admin.headers.get("x-robots-tag"),
    nosniff: admin.headers.get("x-content-type-options"),
    referrer: admin.headers.get("referrer-policy"),
    hsts: admin.headers.get("strict-transport-security")
  });

  const me = await fetch("https://granit-karel.ru/admin/api/me").then((r) => r.json());
  console.log("\n=== /admin/api/me ===", me);

  const login = await fetch("https://granit-karel.ru/admin/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "wrong-password-audit" })
  });
  console.log("\n=== bad login ===", login.status, await login.json());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
