export async function onRequestGet({ env }) {
  const data = await env.STORE_KV.get('news', { type: 'json' });
  return new Response(JSON.stringify(data || []), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Authorization") !== "Bearer admin-validated-token") {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const newNews = await request.json();
  const data = await env.STORE_KV.get('news', { type: 'json' }) || [];
  newNews.id = "news_" + Date.now() + "_" + Math.floor(Math.random()*1000);
  // Add newest at the beginning
  data.unshift(newNews);
  await env.STORE_KV.put('news', JSON.stringify(data));
  return new Response(JSON.stringify(newNews), { status: 201 });
}

export async function onRequestPut({ request, env }) {
  if (request.headers.get("Authorization") !== "Bearer admin-validated-token") return new Response("Unauthorized", { status: 401 });
  const updatedNews = await request.json();
  const data = await env.STORE_KV.get('news', { type: 'json' }) || [];
  const idx = data.findIndex(n => n.id === updatedNews.id);
  if (idx !== -1) {
    data[idx] = updatedNews;
    await env.STORE_KV.put('news', JSON.stringify(data));
    return new Response(JSON.stringify(updatedNews), { status: 200 });
  }
  return new Response("Not found", { status: 404 });
}

export async function onRequestDelete({ request, env }) {
  if (request.headers.get("Authorization") !== "Bearer admin-validated-token") return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const data = await env.STORE_KV.get('news', { type: 'json' }) || [];
  let newData = [];
  if (id !== "all") {
      newData = data.filter(n => n.id !== id);
  }
  await env.STORE_KV.put('news', JSON.stringify(newData));
  return new Response(JSON.stringify({ success: true, count: newData.length }), { status: 200 });
}
