const elements = {
  animateSwitch: null,
  video: null,
  cameraContainer: null,
  camera: null,
  canvas: null,
  photo: null,
  startButton: null,
  restartButton: null,
  downloadButton: null,
  flipButton: null,
  output: null,
};

const buttons = ['startButton', 'restartButton', 'downloadButton', 'flipButton'];

const windowState = {
  height: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
  width: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
};

const videoState = {
  streaming: false,
  facingUser: true,
  supportsFacing: false,
  width: 0,
  height: windowState.height > 725 ? 725 : windowState.height - windowState.height / 3,
  stream: null,
  startAgainTimeout: null,
  /** ADD 3 NEW PROPERTIES **/
  /** 1 - BROADCAST CHANNEL INSTANCE **/
  broadcast: new BroadcastChannel('QRCode_Reader'),
  /** 2 - BOOLEAN FOR TRACKING IF WE ARE READING QR CODES **/
  readingQRCodes: true,
  /** 3 - VARIABLE FOR HOLDING SETINTERVAL TIMER ID (TO CLEAR LATER) **/
  setIntervalTimer: null,
};

/** SET UP THE VIDEOSTATE BROADCAST CHANNEL ONMESSAGE EVENT LISTENER **/
/** 1 - CHECK EVENT FOR DATA **/
/** 2 - STOP THE PROCESSIMG INTERVAL AND SET THE READING BOOLEAN TO FALSE ON VIDEOSTATE **/
/** 3 - DEBOUNCE SHOWING THE RESULTS BY 500ms **/
/** 4 - COPY THE DATA TO THE CLIPBOARD **/
/** 5 - TAKE A PICTURE AND PASS A CALLBACK FUNCTION THAT WILL DISPLAY THE DATA AS A ONSEN UI TOAST NOTIFICATION **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API */
videoState.broadcast.onmessage = (event) => {
 if (event.data){
  if (videoState.setIntervalTimer){
    clearInterval(videoState.setIntervalTimer)
  }
    readingQRCodes = false
    if (videoState.setIntervalTimer) {
    clearInterval(videoState.setIntervalTimer);
    }
    videoState.setIntervalTimer = setTimeout(() => {
       copyToClipboard(event.data.result);
      takePicture(() =>
        ons.notification.toast(event.data.result, {
          timeout: 500,
        })
      );
    }, 500);

  
}
};

/** CREATE FUNCTION THAT TAKES A STRING AND SETS IT IN THE CLIPBOARD USING THE CLIPBOARD API **/
/** 1 - ASK PERMISSION USING NAVIGATOR TO WRITE TO THE CLIPBOARD **/
/** 2 - IF GRANTED WRITE THE TEXT TO THE CLIPBOARD **/
/** RESORUCE - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard */
const copyToClipboard = async (text) => {
  try {
    /** ASK PERMISSION (navigator.permissions.query) **/ 
    const result = await navigator.permissions.query({name: "clipboard-write"});
    /** IF GRANTED OR PROMPT WRITE TO CLIPBOARD **/ 
    if (result.state == "granted" || result.state == "prompt") {
      /* write to the clipboard now */
      navigator.clipboard.writeText(text);
    }
  } catch (e) {
    console.log(`Error copying to clipboard`, e);
  }
}

/** ALLOW TAKEPICTURE TO ACCEPT A CALLBACK **/
/** 1 - ADD NEW ARGUMENT TO THE TAKEPICTURE FUNCTION CALLED 'CALLBACK' **/
/** 2 - AFTER THE TRANSITIONEND SETTIMEOUT CHECK FOR A CALLBACK **/
/** 3 - IF THERE IS A CALLBACK WAIT 500ms USING SETTIMEOUT TO CALL THE CALLBACK **/
/** RESORUCE -  https://developer.mozilla.org/en-US/docs/Web/API/setTimeout **/
const takePicture = (callback) => {
  transitionStart();
  const ctx = elements.canvas.getContext('2d');
  const width = elements.video.videoWidth;
  const height = elements.video.videoHeight;
  if (width && height) {
    elements.canvas.width = width;
    elements.canvas.height = height;
    ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
    const data = canvas.toDataURL('image/png');
    elements.photo.setAttribute('src', data);
    elements.output.style.display = 'inline-block';
    elements.camera.style.display = 'none';
    elements.startButton.style.display = 'none';
    elements.flipButton.style.display = 'none';
    elements.restartButton.style.display = 'block';
    elements.downloadButton.style.display = 'unset';
    setTimeout(transitionEnd, 250);
    /** CHECK IF THERE WAS A CALLBACK PASSED IN **/
    if (callback) {
      /** IF THERE IS A CALLBACK, USE SETTIMEOUT TO WAIT 500ms TO CALL THE CALLBACK **/
      setTimeout(callback, 500);
    }
  } else {
    clearPhoto();
  }
};

/** PROCESSIMG SHOULD USE THE CANVAS ELEMENT TO CREATE AN IMAGE, TO SEND OVER THE BROADCAST CHANNEL **/
/** THIS FUNCTION WILL BE CALLED USING A SETINTERVAL TIMER EVERY 250ms  **/
/** THIS FUNCTION WILL BE VERY SIMILAR TO THE TAKEPICTURE FUNCTION  **/
/** 1 - GET CANVAS CONTEXT **/
/** 2 - DRAW THE IMAGE ON THE CANVAS USING CTX.DRAWIMAGE() **/
/** 3 - GET THE IMAGE DATA USING CTX.GETIMAGEDATA() **/
/** 4 - SEND IMAGE DATA, WIDTH, AND HEIGHT OVER BROADCAST CHANNEL TO SERVICE WORKER **/
/** RESORUCE - https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API **/
const processImg = () => {
  /** ONLY PROCESS IMAGES IF THE READING BOOLEAN IS TRUE ON THE VIDEOSTATE  **/
  if(videoState.readingQRCodes) {
    /** GET THE CANVAS CTX & VIDEO HEIGHT/WIDTH JUST LIKE TAKEPICTURE  **/
    const ctx = elements.canvas.getContext('2d');
    const width = elements.video.videoWidth;
    const height = elements.video.videoHeight;
    if (width && height) {
      elements.canvas.width = width;
      elements.canvas.height = height;
       /** DRAW THE IMAGE ON THE CANVAS JUST LIKE TAKEPICTURE **/
       ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
      /** GET THE IMAGE DATA FROM THE CTX AFTER DRAWING, CTX.GETIMAGEDATA()  **/
       const imageData = ctx.getImageData(0, 0, elements.canvas.width, elements.canvas.height);
     /** USE THE BROADCAST CHANNEL ON THE VIDEOSTATE OBJECT TO SEND THE IMAGE DATA, HEIGHT & WIDTH ACROSS TO THE SERVICE WORKER  **/
     videoState.broadcast.postMessage({
      type: "READING",
      input: {
        width: elements.canvas.width,
        height: elements.canvas.height,
        imageData: imageData,
      },
    });
    }
  }
};

/** CLEARING A PHOTO SHOULD START THE QR CODE READING PROCESS OVER AGAIN **/
/** 1 - AFTER HIDING THE RESTARTBUTTON, SET THE VIDEOSTATE BOOLEAN FOR READING QR CODES TO TRUE **/
/** 2 - CLEAR THE PROCESS IMG INTERVAL USING THE SAVED ID IN VIDEOSTATE **/
/** 3 - RE SET UP THE PROCESS IMG INTERVAL AND SAVE THE ID IN VIDEOSTATE FOR EVERY 250ms **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/setInterval */
const clearPhoto = () => {
  transitionStart();
  const ctx = elements.canvas.getContext('2d');
  ctx.fillStyle = '#457B9D';
  ctx.fillRect(0, 0, elements.canvas.width, elements.canvas.height);

  const data = canvas.toDataURL('image/png');
  elements.photo.setAttribute('src', data);
  elements.camera.style.display = 'inline-block';
  elements.output.style.display = 'none';
  elements.downloadButton.style.display = 'none';
  elements.startButton.style.display = 'block';
  elements.flipButton.style.display = 'block';
  elements.restartButton.style.display = 'none';
  /** SET VIDEOSTATE READING QR CODE BOOLEAN TO TRUE, RE SET UP THE PROCESS IMG SET INTERVAL AFTER CLEARING **/
  /** reading = true **/
  videoState.readingQRCodes = true;
  /** clearInterval() **/
  /** setInterval() **/ 
  if(videoState.setIntervalTimer)
  clearInterval(videoState.setIntervalTimer);
  setInterval(processImg,250);
  setTimeout(transitionEnd, 250);
};

/** INITIATE STREAM SHOULD CLEAR THE PROCESS IMG SETINTERVAL TIMER AND START IT AGAIN **/
/** 1 - AFTER THE TRANSITION ENDS CLEAR THE PROCESS IMG SETINTERVAL ID **/
/** 2 - RE SET UP THE PROCESS IMG INTERVAL AND SAVE THE ID IN VIDEOSTATE FOR EVERY 250ms **/
/** RESOURCE - https://developer.mozilla.org/en-US/docs/Web/API/setInterval */
const initiateStream = async (opts) => {
  try {
    const strm = await navigator.mediaDevices.getUserMedia(opts || { video: true, audio: false });
    videoState.stream = strm;
    elements.video.srcObject = strm;
    elements.video.play();
    calculateSize();
    transitionEnd();
    /** clearInterval() **/
    /** setInterval() **/
    if (videoState.setIntervalTimer) 
    clearInterval(videoState.setIntervalTimer)
    setInterval(processImg,250)
  } catch (e) {
    console.log('An error occurred: ' + e);
    elements.animateSwitch.style.backgroundColor = '#E63946';
    elements.animateSwitch.style.opacity = 1;
    elements.startButton.disabled = true;
  }
};

const calculateWidth = () => {
  videoState.height = windowState.height > 725 ? 725 : windowState.height - windowState.height / 3;
  videoState.width = elements.video.videoWidth / (elements.video.videoHeight / videoState.height);

  if (isNaN(videoState.width)) {
    videoState.width = videoState.height / (4 / 3);
  }
};

const calculateHeight = () => {
  videoState.width = windowState.width - 50;
  videoState.height = elements.video.videoHeight / (elements.video.width / videoState.width);

  if (isNaN(videoState.height)) {
    videoState.height = videoState.width / (4 / 3);
  }
};

const calculateSize = () => {
  calculateWidth();

  if (windowState.width < videoState.width) {
    calculateHeight();
  }
};

const handleResize = () => {
  windowState.width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  windowState.height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

  if (videoState.streaming) {
    transitionStart();
    videoState.stream.getTracks().forEach((trk) => trk.stop());
    videoState.streaming = false;

    if (videoState.startAgainTimeout) clearTimeout(videoState.startAgainTimeout);
    videoState.startAgainTimeout = setTimeout(initiateStream, 250);
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (videoState.streaming) {
      transitionStart();
      videoState.stream.getTracks().forEach((trk) => trk.stop());
      videoState.streaming = false;
    }
  } else {
    initiateStream();
  }
}

const downloadImage = (data, filename = 'untitled.jpeg') => {
  const link = document.createElement('a');
  link.href = data;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
};

const flipCamera = async () => {
  videoState.facingUser = !videoState.facingUser;
  if (videoState.streaming) {
    transitionStart();
    videoState.stream.getTracks().forEach((trk) => trk.stop());
    videoState.streaming = false;
  }
  let opts = { video: true, audio: false };
  if (videoState.supportsFacing) {
    opts.video = { facingMode: videoState.facingUser ? 'user' : 'environment' }
  } else {
    const tracks = videoState.stream.getVideoTracks();
    if (tracks.length > 0) {
      const curDevice = tracks[0].label;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.label !== curDevice);
      opts.video = { deviceId: videoDevices[0].deviceId };
    }
  }
  initiateStream(opts);
};

const checkCameras = async () => {
  try {
    const supports = navigator.mediaDevices.getSupportedConstraints();
    if (supports.facingMode === true) {
      videoState.supportsFacing = true;
      elements.flipButton.style.display = 'block';
      elements.flipButton.addEventListener('click', flipCamera);
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    if (videoDevices.length > 1) {
      elements.flipButton.style.display = 'block';
      elements.flipButton.addEventListener('click', flipCamera);
      return;
    }
  } catch (e) {
  }
}

const startStream = () => {
  if (!videoState.streaming) {
    calculateSize();

    Object.keys(elements)
      .filter((k) => !buttons.includes(k))
      .forEach((k) => {
        const elmnt = elements[k];
        if (elmnt.style) {
          elmnt.style.width = `${videoState.width}px`;
          elmnt.style.height = `${videoState.height}px`;
        }
      });
    videoState.streaming = true;
  }
};

const transitionStart = () => (elements.animateSwitch.style.opacity = 1);
const transitionEnd = () => (elements.animateSwitch.style.opacity = 0);

const startup = () => {
  elements.animateSwitch = document.querySelector('.animate-switch');
  elements.video = document.querySelector('#video');
  elements.camera = document.querySelector('.camera');
  elements.canvas = document.querySelector('#canvas');
  elements.photo = document.querySelector('#photo');
  elements.startButton = document.querySelector('#start');
  elements.restartButton = document.querySelector('#restart');
  elements.downloadButton = document.querySelector('#download');
  elements.flipButton = document.querySelector('#switch-camera');
  elements.output = document.querySelector('.output');
  elements.cameraContainer = document.querySelector('.camera-container');
  checkCameras();
  transitionStart();

  window.addEventListener('resize', handleResize);

  document.addEventListener('visibilitychange', handleVisibilityChange);

  initiateStream();

  elements.video.addEventListener('canplay', startStream, false);

  elements.startButton.addEventListener('click', (e) => {
    e.preventDefault();
    takePicture();
  });

  elements.restartButton.addEventListener('click', (e) => {
    e.preventDefault();
    clearPhoto();
  });

  elements.downloadButton.addEventListener('click', (e) => {
    e.preventDefault();
    downloadImage(elements.canvas.toDataURL(), `Snap ${new Date().toLocaleString()}`);
  });
};

document.addEventListener('init', startup)
