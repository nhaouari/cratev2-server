const session = require("crate-backend");
const fs = require("fs");
const jsonfile = require("jsonfile");
const wrtc = require("wrtc");
const request = require("request");
const store = require("store");

let Marker = session.Marker;

// If you change this, change it in common also
if (!store.get("config5")) {
  var configuration = {
    //    signalingServer: "https://172.16.9.236:3000",
    signalingServer: "https://signaling.herokuapp.com",
    storageServer: "https://storagecrate.herokuapp.com",
    stun: "23.21.150.121" // default google ones if xirsys not
  };
} else {
  var configuration = store.get("config5");
}

let editingSession = process.argv[2];
console.log("Document opened: SessionID = " + editingSession);

// default settings
session.config = {
  signalingServer: configuration.signalingServer,
  storageServer: configuration.storageServer,
  stun: configuration.stun, // default google ones if xirsys not
  containerID: "content-default",
  display: false
};

if (!store.get("myId")) {
  generateID();
}

let options = { editingSession, wrtc };

var file = `./tmp/crate-${editingSession}.json`;

let documentLoaded = () => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(file)) {
      console.log(`Document ${editingSession} wakes up`);
      jsonfile.readFile(file, (err, obj) => {
        options.importFromJSON = obj;
        options.changesTimeOut = 10 * 1000;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

documentLoaded().then(() => {
  
 const crate = new session(options)
  crate.on("new_document", () => {
    setTimeout(() => {
      process.send({
        type: "established",
        id: editingSession
      });
      console.log("established");

      crate._documents[0].core.on("outdated", () => {
        saveDocument(crate._documents[0]);
        console.log("Document " + editingSession + " is in sleeping mode");
        /**
         * this is to remove the document from the server index
         * @type {[type]}
         */

        console.log("outdated");
        process.send({
          type: "kill",
          id: editingSession
        });
      });
    }, 500);
  });
});
/**
 * saveDocument save the document in tmp folder
 */
function saveDocument(document) {
  var timeNow = new Date().getTime();
  var doc = {
    date: timeNow,
    title: document.name,
    delta: {},
    sequence: document.sequence,
    causality: document.causality,
    name: document.name,
    webRTCOptions: document.webRTCOptions,
    markers: {},
    signalingOptions: document.signalingOptions
  };

  var file = `./tmp/crate-${document.signalingOptions.session}.json`;

  jsonfile.writeFile(file, doc, function(err) {
    console.error(err);
  });
}

function generateID() {
  id = session.GUID();
  pseudo = Marker.getPseudoname(id);
  store.set("myId", {
    id: id,
    pseudo: pseudo
  });
}

process.on("unhandledRejection", error => {
  // Prints "unhandledRejection woops!"
  console.log("unhandledRejection ", error);
});

process.on("uncaughtException", error => {
  // Prints "unhandledRejection woops!"
  console.log("uncaughtException", error);

  /**
   * this is to remove the document from the server index
   * @type {[type]}
   */
  process.send({
    type: "error",
    id: process.argv[2]
  });
});
