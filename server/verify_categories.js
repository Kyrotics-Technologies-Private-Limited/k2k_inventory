const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5567,
    path: '/api/categories',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const categories = JSON.parse(data);
            if (categories.length > 0) {
                console.log(categories[0].id); // Just print the ID
            } else {
                console.log('NO_CATEGORIES');
            }
        } catch (e) {
            console.error('ERROR');
        }
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.end();
