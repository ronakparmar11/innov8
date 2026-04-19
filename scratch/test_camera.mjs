import http from 'http';

const url = 'http://192.168.1.101:8080/video';

console.log(`Checking camera at ${url}...`);

const req = http.get(url, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let bytes = 0;
  res.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > 1000) {
      console.log('Received data stream successfully!');
      process.exit(0);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

req.setTimeout(5000, () => {
    console.error('Timeout!');
    process.exit(1);
});
