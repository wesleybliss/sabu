'use strict'

const fs = require('fs')
const path = require('path')
const restify = require('restify')
const corsMiddleware = require('restify-cors-middleware')
const basicAuth = require('./basic-auth')
const mime = require('mime-types')
const {
    getCleanUrl,
    getCleanPath,
    isBinary,
    sendFile
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
        
        let url         = getCleanUrl(req.url)
        let filePath    = getCleanPath(url, req.url)
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
        
        sendFile(res, sentFile)
        
        console.info('⇆', path.basename(sentFile), mime.lookup(sentFile))
        
    })
    
    return app
    
}
