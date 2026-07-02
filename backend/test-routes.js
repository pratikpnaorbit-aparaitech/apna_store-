const fs = require('fs');
const path = require('path');

const routesDir = './routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

console.log('Testing route files...\n');

files.forEach(file => {
  try {
    console.log(`Testing ${file}...`);
    const routePath = path.join(routesDir, file);
    
    // Try to require the route file
    const route = require(routePath);
    
    // Check if it's a valid router
    if (route && typeof route === 'function') {
      console.log(`✅ ${file} - OK (router function)`);
    } else if (route && route.stack) {
      console.log(`✅ ${file} - OK (express router)`);
    } else {
      console.log(`⚠️ ${file} - Loaded but not a router`);
    }
  } catch (err) {
    console.log(`❌ ${file} - ERROR: ${err.message}`);
    if (err.stack) {
      console.log(err.stack.split('\n')[1]);
    }
  }
  console.log('---');
});
