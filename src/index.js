'use strict'

const fs = require('fs')
const path = require('path')
const program = require('commander')
const app = require('./app')

process.title = 'sabu'

const defaultOpts = {
    source:     process.cwd(),
    sourceRel:  process.cwd(),
    host:       process.env.HOST || '0.0.0.0',
    port:       process.env.PORT || 8080
}

program
    .version('1.0.0')
    .usage('[options]')
    .arguments('[path]')
    .option('-h, --host <s>', 'Host (default: "0.0.0.0"')
    .option('-p, --port <n>', 'Port (default: 8080)', parseInt)
    .option('-c, --config <s>', 'JSON config file with options')
    .action(target => { source = target })

program.parse(process.argv)

const connect = (host, port, source) => {
    app.listen(port, host, () => {
        if (triedConnecting) {
            // Clear previous output since the port likely changed
            process.stdout.moveCursor(0)
            process.stdout.clearLine()
            process.stdout.moveCursor(0, -2)
            process.stdout.clearLine()
        }
        triedConnecting = true
        process.stdout.write(`Sabu listening at http://${host}:${port}\n`)
        process.stdout.write(`Files served from ${source}\n`)
    })
}

const start = opts => {
    
    let {
        source,
        sourceRel,
        host,
        port
    } = opts
    
    try {
        sourceRel = path.relative(process.cwd(), source)
        sourceRel = sourceRel ? sourceRel : '.'
    }
    catch (e) {}
    
    if (!fs.existsSync(source))
        throw new Error('Path not found "' + source + '"')
    
    app.on('error', e => {
        if (e.code === 'EADDRINUSE') {
            port++
            connect(host, port, (sourceRel || source))
        }
    })
    
    app.on('connected', () => { console.log('connect') })
    
    connect(host, port, (sourceRel || source))
    
}

let opts = null
let triedConnecting = false

if (program.config) {
    
    // Use JSON config
    
    if (!fs.existsSync(program.config))
        throw new Error('Config file not found', program.config)
    
    opts = fs.readFileSync(program.config, 'utf8')
    
    try {
        opts = JSON.parse(opts)
        opts = Object.assign(defaultOpts, opts)
    }
    catch (e) {
        console.error('Failed to load config file')
        throw e
    }
    
}
else {
    
    // Use CLI options
    
    opts = Object.assign({}, defaultOpts)
    
    if (program.host) opts.host = program.host
    if (program.port) opts.port = program.port
    
}

start(opts)
