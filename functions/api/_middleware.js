export async function validateAdmin(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.split(" ")[1];
  
  if (!env.SUPABASE_JWT_SECRET) {
    console.error("SUPABASE_JWT_SECRET is not set in environment variables.");
    return false;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();
    
    // 1. Verify Signature
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.SUPABASE_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify("HMAC", key, signature, data);

    if (!isValid) return false;

    // 2. Parse Payload and check expiration
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) return false;
    
    return true; 
  } catch (e) {
    console.error("JWT Validation Error:", e);
    return false;
  }
}

export async function onRequest({ request, next, env }) {
    // Attach validateAdmin to the context if needed, but in Pages, we can't easily attach to 'env' or 'request' 
    // without using a custom context. 
    // However, we can just export it and import it in other files? 
    // No, Pages functions are separate modules.
    
    // Actually, I'll just keep the helper in each file for now as it's more straightforward for Cloudflare Pages 
    // unless I use the 'data' context in _middleware.
    
    return next();
}
