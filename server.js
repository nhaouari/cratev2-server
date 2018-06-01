/**
 * THis is the crate storage Server. this server stores the document as json doc ones it it connected and it is updated every time.
 * @author Noureddine Haouari
 * 
 */


var express = require('express');
var app = express();
const fork = require('child_process').fork;
var path = require('path')
var psTree = require('ps-tree');
var fs = require('fs');
var debug = require('debug')('crate:storage-server')
var running = {};
var waiting = {};

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', function(req, res) {
    res.send('<h1>Storage CRATE server</h1>');
})


app.get('/:action/:session', function(req, res) {
    debug('receive a request ', 'session', [req.params.session], ' action', [req.params.action])
    switch (req.params.action) {
        case "join":
            debug('join session ', [req.params.session])

            if (!running[req.params.session] && !waiting[req.params.session]) {
                var pid = newDocument(req.params.session, res);
                waiting[req.params.session] = pid;
                debug('Waiting for the document creation ', [req.params.session])

            } else if (running[req.params.session]) {
                debug('the document is already running ', [req.params.session])
                res.send('{"results":1}');
            }
            break;
        case "kill":
            debug('kill session ', [req.params.session])

            if (running[req.params.session]) {
                let pid = running[req.params.session]
                procs[pid].kill()
                delete procs[pid]
                delete running[req.params.session];
                debug('Delete the document with SessionID ', [req.params.session], " PID: " + running[req.params.session])
            }

        case "exist":
          debug('session exist', [req.params.session])
            // console.log("Exist ? " + req.params.session);
            if (running[req.params.session]) {
                res.send('{"results":1}');
                debug('Yes it is running')
            } else {
                var file = `./tmp/crate-${req.params.session}.json`

                if (fs.existsSync(file)) { // sleeping mode
                    res.send('{"results":2}');
                     debug('Yes but it is in sleeping mode')
                    //  console.log('			{"results":2}');
                } else {
                    res.send('{"results":0}');
                     debug('No')
                    // console.log('           {"results":0}');
                }
            }
            break;
        default:
    }



});


var port = process.env.PORT || 3000

var server = app.listen(port, function() {
    var host = server.address().address
    var port = server.address().port

    console.log("crate Storage Server listening at http://%s:%s", host, port)
})

var procs = {}

/**
 * [newDocument create a  new document 
 * @param  {[type]} sessionID  the id of the session
 * @param  {[type]} res        used to send a response to the user 
 * @return {[type]}           [description]
 */
function newDocument(sessionID, res) {

   
   debug('New document');


   var exec = require('child_process').exec;
    const program = path.resolve('index.js')
    const parameters = [sessionID];
    const options = {}

    const child = fork(program, parameters, options);

    child.on('message', (message) => {
        if (message.type == "kill") {

               debug('kill event from  '+ message.id);
            if (message.id) {
                debug("Delete the document with SessionID " + message.id + " PID: " + running[message.id]);
                if (running[message.id])
                    delete running[message.id];

                if (waiting[message.id])
                    delete waiting[message.id]
                setTimeout(() => {
                    child.kill()
                    delete procs[message.id]
                }, 1000);

            }

        }

        if (message.type == "error") {
              debug('Error event from '+ message.id);
            if (message.id) {
                child.kill()
                debug("ERROR: Delete the document with SessionID " + message.id + " PID: " + running[message.id]);
                if (running[message.id])
                    delete running[message.id];

                if (waiting[message.id])
                    delete waiting[message.id]
                delete procs[message.id]
                /*console.log('restart the document')
                var pid = newDocument(message.id, res);
                running[message.id] = pid;
                */
            }
        }
        //when the document establish connection
        if (message.type == "established") {
                debug("Create new document with SessionID " + message.id + " PID: " + running[message.id]);
            if (message.id) {
                running[message.id] = waiting[message.id]
                delete waiting[message.id]
                res.send('{"results":1}');
                console.log
            }
        }


    });

    procs[child.pid] = child
    return child.pid;
}