// uKick — volume

let audioContext,
  gainNode,
  source,
  analyser = null,
  currentBoost = 1,
  streamFeaturesEnabled = true, // Adaptive Stream (autoQuality)
  currentVideo = null,
  boundStream = null,
  boundSrcObject = null,
  audioMode = "none", // "direct" (WebRTC) | "mirror" (captureStream)
  singlePath = false,
  dualPathMode = false, // captureStream
  userVolume = 1,
  selfVolumeChange = false,
  volumeListenerVideo = null,
  healthTimer = null,
  silentChecks = 0,
  lastRecovery = 0;

export function setupAudioContext() {
  const video = document.getElementById("video-player");
  if (!video || !audioContext) return;

  const liveStream =
    video.srcObject instanceof MediaStream ? video.srcObject : null;

  if (
    source &&
    currentVideo === video &&
    audioMode === "mirror" &&
    video.srcObject === boundSrcObject
  )
    return;

  if (
    source &&
    currentVideo === video &&
    audioMode === "direct" &&
    liveStream === boundStream
  )
    return;

  let newSource = null;
  let newMode = null;

  if (liveStream) {
    newSource = audioContext.createMediaStreamSource(liveStream);
    newMode = "direct";
  } else if (video.srcObject || video.currentSrc || video.src) {
    let cap = null;
    try {
      cap =
        video.captureStream?.() ||
        video.mozCaptureStream?.() ||
        video.webkitCaptureStream?.();
    } catch (e) {}
    if (cap && cap.getAudioTracks().length > 0) {
      newSource = audioContext.createMediaStreamSource(cap);
      newMode = "mirror";
    }
  }

  if (!newSource) return;

  if (source)
    try {
      source.disconnect();
    } catch (e) {}

  source = newSource;
  audioMode = newMode;
  boundSrcObject = video.srcObject;
  boundStream = liveStream;
  currentVideo = video;

  if (!gainNode) gainNode = audioContext.createGain();
  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
  }

  if (volumeListenerVideo !== video) {
    video.addEventListener("volumechange", onVolumeChange);
    volumeListenerVideo = video;
  }

  applyGain();
  source.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(audioContext.destination);

  silentChecks = 0;
  updateElementSilencing();
  startHealthCheck();
}

function onVolumeChange() {
  if (selfVolumeChange) {
    selfVolumeChange = false;
    return;
  }
  if (!currentVideo) return;

  userVolume = currentVideo.volume;
  if (singlePath) setElementVolume(currentVideo, 0);
  applyGain();
}

function setElementVolume(video, value) {
  if (video.volume === value) return;
  selfVolumeChange = true;
  try {
    video.volume = value;
  } catch (e) {
    selfVolumeChange = false;
  }
}

function updateElementSilencing() {
  if (!currentVideo || audioMode !== "mirror") return;
  const wantSingle = streamFeaturesEnabled && currentBoost > 1 && !dualPathMode;

  if (wantSingle) {
    if (currentVideo.volume > 0) {
      userVolume = currentVideo.volume;
      setElementVolume(currentVideo, 0);
    }
    if (!singlePath) {
      singlePath = true;
      startMirrorProbe();
    }
  } else if (singlePath) {
    setElementVolume(currentVideo, userVolume);
    singlePath = false;
  }
  applyGain();
}

function startMirrorProbe() {
  let checks = 0;
  const step = () => {
    checks++;
    if (measureRms() > 0.0005) return;
    if (checks < 3) return void setTimeout(step, 500);
    dualPathMode = true;
    singlePath = false;
    if (currentVideo) setElementVolume(currentVideo, userVolume);
    applyGain();
  };
  setTimeout(step, 700);
}

function startHealthCheck() {
  if (healthTimer) return;
  healthTimer = setInterval(() => {
    if (
      singlePath &&
      audioMode === "mirror" &&
      source &&
      currentVideo &&
      !currentVideo.paused &&
      measureRms() < 0.0002
    ) {
      silentChecks++;
      if (silentChecks >= 3 && Date.now() - lastRecovery > 8000) {
        lastRecovery = Date.now();
        silentChecks = 0;
        try {
          source.disconnect();
        } catch (e) {}
        source = null;
        setupAudioContext();
      }
    } else {
      silentChecks = 0;
    }
  }, 2000);
}

function applyGain() {
  if (!gainNode) return;
  const effective = streamFeaturesEnabled ? currentBoost : 1;
  const muteFactor = currentVideo && currentVideo.muted ? 0 : 1;
  gainNode.gain.value = singlePath
    ? effective * userVolume * muteFactor
    : Math.max(0, effective - 1) * muteFactor;
}

function measureRms() {
  try {
    if (!analyser) return 0;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  } catch (e) {
    return 0;
  }
}

export function setVolumeBoost(boostAmount) {
  currentBoost = boostAmount;
  if (audioContext) {
    if (audioMode === "mirror") updateElementSilencing();
    else applyGain();
    if (audioContext.state === "suspended") audioContext.resume();
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if ("volumeBoost" in changes) {
    const v = Number(changes.volumeBoost.newValue);
    setVolumeBoost(isNaN(v) ? 1 : v);
  }
  if ("autoQuality" in changes) {
    streamFeaturesEnabled = changes.autoQuality.newValue === true;
    if (audioMode === "mirror") updateElementSilencing();
    else applyGain();
  }
});

async function applyStoredVolumeBoost() {
  const { volumeBoost = 1, autoQuality = false } =
    await browser.storage.local.get(["volumeBoost", "autoQuality"]);
  streamFeaturesEnabled = autoQuality === true;
  setVolumeBoost(isNaN(Number(volumeBoost)) ? 1 : Number(volumeBoost));
}

export function enableAudioContextOnUserGesture() {
  function initialize() {
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    setupAudioContext();
    applyStoredVolumeBoost().catch(() => {});
    window.removeEventListener("click", initialize);
    window.removeEventListener("keydown", initialize);
  }
  window.addEventListener("click", initialize);
  window.addEventListener("keydown", initialize);
}
