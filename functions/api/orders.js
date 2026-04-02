import { validateAdmin } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  if (!(await validateAdmin(request, env))) return new Response("Unauthorized", { status: 401 });
  const data = await env.STORE_KV.get('orders', { type: 'json' });
  return new Response(JSON.stringify(data || []), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
  const orderDetails = await request.json();
  const data = await env.STORE_KV.get('orders', { type: 'json' }) || [];
  
  orderDetails.id = "ord_" + Date.now() + "_" + Math.floor(Math.random()*1000);
  orderDetails.status = "Pending";
  orderDetails.date = new Date().toISOString();
  
  data.push(orderDetails);
  await env.STORE_KV.put('orders', JSON.stringify(data));
  return new Response(JSON.stringify(orderDetails), { status: 201 });
}

export async function onRequestPut({ request, env }) {
  if (!(await validateAdmin(request, env))) return new Response("Unauthorized", { status: 401 });
  const { id, status } = await request.json();
  const data = await env.STORE_KV.get('orders', { type: 'json' }) || [];
  const idx = data.findIndex(o => o.id === id);
  if (idx !== -1) {
    data[idx].status = status;
    await env.STORE_KV.put('orders', JSON.stringify(data));
    return new Response(JSON.stringify(data[idx]), { status: 200 });
  }
  return new Response("Not found", { status: 404 });
}

export async function onRequestDelete({ request, env }) {
  if (!(await validateAdmin(request, env))) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const data = await env.STORE_KV.get('orders', { type: 'json' }) || [];
  const newData = data.filter(o => o.id !== id);
  await env.STORE_KV.put('orders', JSON.stringify(newData));
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
