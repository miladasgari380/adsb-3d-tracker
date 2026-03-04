import http from 'http';
http.get('http://localhost:5174/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log("Response length:", data.length); });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
