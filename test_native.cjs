const axios = require('axios');
const https = require('https');
axios.get('https://van.bel.tr/Taziyeler.html', {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 15000
}).then(r => {
    console.log("Found:", r.data.split('<div class="qa-box">').length - 1);
}).catch(console.error);
