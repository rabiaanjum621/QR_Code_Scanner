const version = 1.2;
const cacheName = `MyCacheName ${version}`;
const libScripts = [
  'lib/grid.js',
  'lib/version.js',
  'lib/detector.js',
  'lib/formatinf.js',
  'lib/errorlevel.js',
  'lib/bitmat.js',
  'lib/datablock.js',
  'lib/bmparser.js',
  'lib/datamask.js',
  'lib/rsdecoder.js',
  'lib/gf256poly.js',
  'lib/gf256.js',
  'lib/decoder.js',
  'lib/qrcode.js',
  'lib/findpat.js',
  'lib/alignpat.js',
  'lib/databr.js'
];
const onsenUI = [
  'https://unpkg.com/onsenui@2.11.2/css/onsen-css-components.min.css',
  'https://unpkg.com/onsenui@2.11.2/css/onsenui-core.min.css',
  'https://unpkg.com/onsenui@2.11.2/css/onsenui.min.css',
  'https://unpkg.com/onsenui@2.11.2/js/onsenui.min.js',
  'https://unpkg.com/onsenui@2.11.2/css/material-design-iconic-font/css/material-design-iconic-font.min.css',
  'https://unpkg.com/onsenui@2.11.2/css/material-design-iconic-font/fonts/Material-Design-Iconic-Font.woff2'
];
const filesToCache = ["capture.js", ...libScripts, ...onsenUI];

/** 1 - USE SELF.IMPORTSCRIPTS TO IMPORT THE LIBRARY SCRIPTS **/
self.importScripts(...libScripts);
/** 1a - THIS WILL EXPOSE THE qrcode OBJECT IN YOUR SERVICE WORKER CODE **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts */

/** 2 - CREATE BROADCAST CHANNEL API INSTANCE **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API */
const broadcast = new BroadcastChannel('QRCode_Reader');

/** 3 - CREATE BROADCAST CHANNEL ONMESSAGE LISTENER TO PROCESS THE IMG USING THE LIBRARY **/
/** 3a - YOUR ONMESSAGE LISTENER SHOULD RECEIVE THE IMAGE DATA, IMAGE WIDTH AND IMAGE HEIGHT **/
/** 3b - THEN SET THE qrcode.width, qrcode.height AND qrcode.imagedata PROPERTIES **/
/** 3c - THEN CHECK FOR QRCODE DATA BY USING qrcode.process() **/
/** 3d - IF THIS DOES NOT THROW AN EXCEPTION: SEND THE RESULT BACK TO THE FRONT END TO TRIGGER THE COPY TO CLIPBOARD + TOAST NOTIFICATION **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API */
/** RESOURCE - https://github.com/LazarSoft/jsqrcode */
broadcast.onmessage = (e) => {
  if (e.data && e.data.type === "READING") {
    process(e.data.input);
  }
};

const process = (input) => {
  let result = false;
  try {
    qrcode.width = input.width;
    qrcode.height = input.height;
    qrcode.imagedata = input.imageData;
 
    result = qrcode.process();
    broadcast.postMessage({ type: "READING", result });
  } catch (e) {}
};


self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then(async (cache) => {
    for (const file of filesToCache) {
      try {
        // await cache.add(file);
      } catch(e) {
        console.error(file, e);
      }
    }
  }));
  console.log("Service Worker installed...");
});

self.addEventListener("fetch", (event) => {
  console.log(event.request.url, new Date());
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      // Fallback to network and if it fails, return the offline page.
      return fetch(event.request).catch((error) => {
        console.log('Network error...', error);
        console.log('Attempting Offline fallback.');
        return caches.open(cacheName).then((cache) => {
          return cache.match("offline.html");
        });
      });
    })
  );
});

self.addEventListener("activate", (e) => {
  console.log("Service Worker: Activate");
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== cacheName) {
            console.log("Service Worker: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
