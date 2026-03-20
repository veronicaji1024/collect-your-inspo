const https = require('https');

https.get('https://uk.pinterest.com/pin/20758848278337340/', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const match = data.match(/<meta property="og:image" name="og:image" content="([^"]+)"/);
    if (match) {
      console.log(match[1]);
    } else {
      const match2 = data.match(/<meta property="og:image" content="([^"]+)"/);
      if (match2) {
        console.log(match2[1]);
      } else {
        console.log("Not found");
      }
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
