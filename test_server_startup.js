const fs = require('fs');
let code = fs.readFileSync('dist/server.cjs', 'utf8');
code = code.replace(/3000/g, '3005');
fs.writeFileSync('dist/server_3005.cjs', code);
require('./dist/server_3005.cjs');
