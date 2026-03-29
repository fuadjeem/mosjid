export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();
    if (password === env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ success: true, token: "admin-validated-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });
  }
}
