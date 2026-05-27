export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body;
  const correct = process.env.DASHBOARD_PASSWORD || "ecom2026";

  if (password === correct) {
    res.setHeader("Set-Cookie", `auth=1; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`);
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false });
}
