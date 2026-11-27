const { Client } = require("ssh2");

const host = process.env.VPS_HOST;
const username = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD;
const admin = process.env.NEW_ADMIN || process.env.ADMIN_PASSWORD;

if (!host || !password || !admin) {
  console.error("Need VPS_HOST, VPS_PASSWORD, NEW_ADMIN");
  process.exit(1);
}
if (admin.length < 12 || !/[A-Za-zА-Яа-я]/.test(admin) || !/\d/.test(admin)) {
  console.error("Password must be 12+ chars with a letter and a digit");
  process.exit(1);
}

const conn = new Client();
conn
  .on("ready", () => {
    const esc = admin.replace(/'/g, `'\"'\"'`);
    const cmd = [
      "cd /var/www/granity-karelii",
      `printf '%s\\n' '${esc}' > admin/.local-password`,
      "chmod 600 admin/.local-password",
      "pm2 restart granity-admin",
      "echo OK"
    ].join(" && ");
    conn.exec(cmd, (err, stream) => {
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
  .on("error", (err) => {
    console.error(err);
    process.exit(1);
  })
  .connect({ host, username, password, readyTimeout: 60000 });
