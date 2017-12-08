'use strict'

const fs = require('fs')
const isBinaryFile = require('isbinaryfile')

const getCleanUrl = url => {
    // Remove trailing slash
    return (url.split('').pop() !== '/') ? url
        : url.substring(0, url.length - 1)
}

const getCleanPath = url => {
    
    let filePath = url
    
    // Remove trailing slash(es)
    while (filePath.substring(0, 1) === '/')
        filePath = filePath.substring(1)
    
    return filePath
    
}

const isBinary = (filePath, data) => new Promise((resolve, reject) => {
    
    fs.lstat(filePath, (err, stat) => {
        
        if (err) return reject(err)
        
        isBinaryFile(data, stat.size, (err, result) =>
            err ? reject(err) : resolve(!result))
        
    })
    
})

const sendFile = (res, filePath) => {
    
    fs.stat(filePath, (err, stats) => {
        
        if (err) {
            console.error(err)
            return res.send(404, { error: 'File not found' })
        }
        
        res.header('Content-Type', mime.lookup(filePath))
        fs.createReadStream(filePath).pipe(res)
        res.once('result', err => {
            if (err) return res.send(500, { error: err })
        })
        
    })
    
}

module.exports.getCleanUrl = getCleanUrl
module.exports.getCleanPath = getCleanPath
module.exports.isBinary = isBinary
module.exports.sendFile = sendFile
