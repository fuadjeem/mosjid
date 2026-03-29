export async function onRequestGet({ env }) {
  const data = await env.STORE_KV.get('products', { type: 'json' });
  return new Response(JSON.stringify(data || []), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Authorization") !== "Bearer admin-validated-token") {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const newProduct = await request.json();
  const data = await env.STORE_KV.get('products', { type: 'json' }) || [];
  newProduct.id = "prod_" + Date.now() + "_" + Math.floor(Math.random()*1000);
  data.push(newProduct);
  await env.STORE_KV.put('products', JSON.stringify(data));
  return new Response(JSON.stringify(newProduct), { status: 201 });
}

export async function onRequestPut({ request, env }) {
  if (request.headers.get("Authorization") !== "Bearer admin-validated-token") return new Response("Unauthorized", { status: 401 });
  const updatedProduct = await request.json();
  const data = await env.STORE_KV.get('products', { type: 'json' }) || [];
  const idx = data.findIndex(p => p.id === updatedProduct.id);
  if (idx !== -1) {
    data[idx] = updatedProduct;
    await env.STORE_KV.put('products', JSON.stringify(data));
    return new Response(JSON.stringify(updatedProduct), { status: 200 });
  }
  return new Response("Not found", { status: 404 });
}

export async function onRequestDelete({ request, env }) {
  if (request.headers.get("Authorization") !== "Bearer admin-validated-token") return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const data = await env.STORE_KV.get('products', { type: 'json' }) || [];
  let newData = [];
  if (id !== "all") {
      newData = data.filter(p => p.id !== id);
  }
  await env.STORE_KV.put('products', JSON.stringify(newData));
  return new Response(JSON.stringify({ success: true, count: newData.length }), { status: 200 });
}
