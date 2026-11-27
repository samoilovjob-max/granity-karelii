/** Inspect nginx redirect rules on VPS. Env: VPS_HOST, VPS_PASSWORD */
const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;

if (!host || !password) {
  console.error("Need VPS_HOST and VPS_PASSWORD");
  process.exit(1);
}

const remote = `
set -e
echo "=== sites-available excerpt ==="
grep -n -A2 -E 'polezno|postavka|location =' /etc/nginx/sites-available/granit-karel || true
echo "=== enabled links ==="
ls -la /etc/nginx/sites-enabled/
echo "=== curl polezno/postavka ==="
curl -skI -H 'Host: granit-karel.ru' https://127.0.0.1/polezno.html | head -10
echo ---
curl -skI -H 'Host: granit-karel.ru' https://127.0.0.1/postavka.html | head -10
`;

const conn = new Client();
conn
  .on("ready", () => {
    conn.exec(remote, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        conn.end();
        process.exit(code || 0);
      });
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  })
  .connect({ host, username, password, readyTimeout: 60000 });
