const http = require('http');

const data = JSON.stringify({
    name: "Test Wireless Mouse",
    description: "A high quality wireless mouse",
    price: { amount: 500, currency: "INR" },
    categoryId: "xdEbrS9jP3B7sHOIo9wR"
});

const options = {
    hostname: 'localhost',
    port: 5567,
    path: '/api/products/create',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Response:', responseData);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
