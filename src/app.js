'use strict'

const fs = require('fs')
const path = require('path')
const restify = require('restify')
const corsMiddleware = require('restify-cors-middleware')
const basicAuth = require('./basic-auth')
const mime = require('mime-types')
const he = require('he')
const {
    getCleanUrl,
    getCleanPath,
    isBinary,
    sendFile,
    directoryListing
} = require('./utils')

const app = restify.createServer({
    name:    'Sabu',
    version: '1.0.0'
})

const defaultCorsConfig = {
    preflightMaxAge: 5, // Optional
    origins: ['*'],
    allowHeaders: [
        'X-Access-Token',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers'
    ],
    exposeHeaders: ['API-Token-Expiry']
}

// @todo Cleanup this massive function
module.exports = opts => {
    
    const corsConfig = !opts.cors
        ? defaultCorsConfig
        : Object.assign(defaultCorsConfig, opts.cors)
    
    const cors = corsMiddleware(corsConfig)
    
    app.use(restify.plugins.acceptParser(app.acceptable))
    app.use(restify.plugins.fullResponse())
    app.use(restify.plugins.queryParser())
    app.use(restify.plugins.bodyParser({ extended: true }))
    app.use(restify.plugins.gzipResponse())
    app.use(restify.plugins.authorizationParser())
    app.pre(cors.preflight)
    app.use(cors.actual)
    
    app.pre(restify.plugins.pre.dedupeSlashes())
    app.pre(restify.plugins.pre.userAgentConnection())
    
    if (opts.basicAuth) {
        const user = opts.basicAuth.user || 'user'
        const pass = opts.basicAuth.pass || 'pass'
        app.use(basicAuth(app.name, user, pass))
    }
    
    app.on('InternalError', (req, res, err) => {
        console.error(err)
        res.send(err.statusCode || 500, { error: err })
    })
    
    app.use((req, res, next) => {
        console.info(req.method, req.url)
        next()
    })
    
    app.on('after', (req, res, route, err) => {
        if (err) console.error(err)
    })
    
    // app.get(/\/.*/, restify.plugins.serveStatic({
    //     default: 'index.html',
    //     directory: path.resolve(__dirname, '../public'),
    //     appendRequestPath: false,
    //     charSet: 'utf-8'
    // }))
    
    app.get(/\/.*/, (req, res) => {
        
        const source = opts.source
        const index = opts.index || path.join(opts.source, 'index.html')
        
        let uri         = getCleanUrl(req.url)
        let filePath    = getCleanPath(uri, req.url)
        let filePathAbs = path.resolve(source, filePath)
        let fileExists  = fs.existsSync(filePathAbs) && fs.lstatSync(filePathAbs).isFile()
        let sentFile    = ''
        
        if (fileExists) {
            // Allow the filesystem to find the actual file
            // console.info('file', filePathAbs, 'exists')
            sentFile = filePathAbs
        }
        else {
            // Reroute misses back to the main page
            sentFile = index
        }
        
        if (fs.existsSync(sentFile)) {
            
            // Send file
            sendFile(res, sentFile)
            
        }
        else {
            
            // Send directory index
            sentFile = path.resolve(__dirname, 'index.html')
            
            if (uri.trim().length < 1)
                uri = '/'
            
            let uplink = ''
            let template = fs.readFileSync(sentFile, 'utf8')
            let dirlist = directoryListing(filePathAbs)
            
            try {
                let uriparts = uri.split('/').filter(x => x && x.trim())
                console.log(uriparts)
                uplink = (uriparts.length <= 1)
                    ? '/'
                    : uriparts.slice(0, uriparts.length - 1)
                uplink = `<p><a href="${uplink}">..</a></p>`
            }
            catch (e) {}
            
            dirlist = uplink + dirlist
            template = template.replace('%title%', `Index of ${he.encode(uri)}`)
            template = template.replace('%abspath%', filePathAbs)
            template = template.replace('%header%', `Index of ${he.encode(uri)}`)
            template = template.replace('%data%', dirlist)
            
            res.writeHead(200, {
                'Content-Length': Buffer.byteLength(template),
                'Content-Type': 'text/html'
            })
            res.write(template)
            res.end()
            
        }
        
        console.info('⇆', path.basename(sentFile), mime.lookup(sentFile))
        
    })
    
    return app
    
}
