'use strict'

const fs = require('fs')
const path = require('path')

module.exports = () => {
    
    const file = path.join(process.cwd(), 'sabu.conf.json')
    
    if (fs.existsSync(file))
        throw new Error('Sabu config "sabu.conf.json" already exists')
    
    const template = `{
    "source": ".",
    "host": "0.0.0.0",
    "port": 8080,
    "basicAuth": {
        "user": "myuser",
        "pass": "mypass"
    },
    "cors": {
        "preflightMaxAge": 5,
        "origins": ["*"],
        "allowHeaders": [
            "X-Access-Token",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers"
        ],
        "exposeHeaders": ["API-Token-Expiry"]
    },
    "routes": {
        "/": "index.html"
    }
}`
    
    try {
        fs.writeFileSync(file, template, 'utf8')
        console.info('Saved sabu.conf.json to', process.cwd())
    }
    catch (e) {
        throw e
    }
    
}
