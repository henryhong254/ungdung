const http = require('http');

const url = "http://localhost:3000/api/cron?secret=MY_CRON_SECRET";

function pingCron() {
  console.log(`[${new Date().toISOString()}] Pinging cron endpoint...`);
  
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[${new Date().toISOString()}] Response (${res.statusCode}): ${data}`);
    });
  }).on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Error pinging cron:`, err.message);
  });
}

// Run immediately once
pingCron();

// Run every 60 seconds
setInterval(pingCron, 60000);
