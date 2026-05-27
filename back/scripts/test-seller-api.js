const fetch = global.fetch || require('node-fetch');

async function main() {
  const login = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'seller1', password: '123456' })
  });
  const loginData = await login.json();
  console.log('login', login.status, loginData.success);
  if (!loginData.success) {
    console.error(loginData);
    process.exit(1);
  }
  const token = loginData.data?.token;
  if (!token) {
    console.error('no token', JSON.stringify(loginData, null, 2));
    process.exit(1);
  }
  const resCategories = await fetch('http://localhost:3000/api/seller/categories', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataCategories = await resCategories.json();
  console.log('categories', resCategories.status, JSON.stringify(dataCategories, null, 2));

  const resProducts = await fetch('http://localhost:3000/api/seller/products', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataProducts = await resProducts.json();
  console.log('products', resProducts.status, JSON.stringify(dataProducts, null, 2));

  const resMetrics = await fetch('http://localhost:3000/api/seller/metrics', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataMetrics = await resMetrics.json();
  console.log('metrics', resMetrics.status, JSON.stringify(dataMetrics, null, 2));

  const resOrders = await fetch('http://localhost:3000/api/seller/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataOrders = await resOrders.json();
  console.log('orders', resOrders.status, JSON.stringify(dataOrders, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});