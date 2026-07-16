import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

window.__DAWNLINE_BOOTED__ = true;

const CONFIG = Object.freeze({
  earthSegments: 128,
  cloudSegments: 96,
  maxPixelRatio: 2,
  cloudRotationRadiansPerSecond: 0.00012,
  hudUpdateMs: 200,
  inputSyncMs: 250,
  defaultCamera: [0, 0.38, 4.15],
  nightBoost: 1.42,
  twilightStrength: 1.0,
});

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// -----------------------------------------------------------------------------
// Astronomy
// Compact solar-position calculation suitable for a world-clock visualization.
// It does not model refraction, terrain, elevation, or a flattened Earth.
// -----------------------------------------------------------------------------
function sunPosition(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const daysFromJ2000 = jd - 2451545.0;
  const meanLongitude = positiveModulo(280.460 + 0.9856474 * daysFromJ2000, 360);
  const meanAnomaly = positiveModulo(357.528 + 0.9856003 * daysFromJ2000, 360) * DEG;
  const eclipticLongitude = (
    meanLongitude +
    1.915 * Math.sin(meanAnomaly) +
    0.020 * Math.sin(2 * meanAnomaly)
  ) * DEG;
  const obliquity = (23.439 - 0.0000004 * daysFromJ2000) * DEG;
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude));
  const gmstHours = positiveModulo(18.697374558 + 24.06570982441908 * daysFromJ2000, 24);
  const gmst = gmstHours * 15 * DEG;
  const subsolarLongitude = wrapRadians(rightAscension - gmst);
  return { declination, subsolarLongitude };
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function wrapRadians(value) {
  return positiveModulo(value + Math.PI, Math.PI * 2) - Math.PI;
}

function sunDirection(date) {
  const { declination, subsolarLongitude } = sunPosition(date);
  return new THREE.Vector3(
    Math.cos(subsolarLongitude) * Math.cos(declination),
    Math.sin(declination),
    -Math.sin(subsolarLongitude) * Math.cos(declination),
  ).normalize();
}

function sunAltitudeDegrees(latitude, longitude, date) {
  const { declination, subsolarLongitude } = sunPosition(date);
  const latitudeRadians = latitude * DEG;
  const longitudeRadians = longitude * DEG;
  const cosineZenith =
    Math.sin(latitudeRadians) * Math.sin(declination) +
    Math.cos(latitudeRadians) * Math.cos(declination) *
      Math.cos(longitudeRadians - subsolarLongitude);
  return Math.asin(THREE.MathUtils.clamp(cosineZenith, -1, 1)) * RAD;
}

function hourAngle(longitude, date) {
  const { subsolarLongitude } = sunPosition(date);
  return wrapRadians(longitude * DEG - subsolarLongitude);
}

function lightPhase(altitude, hourAngleRadians) {
  const morning = hourAngleRadians < 0;
  if (altitude >= 6) return morning ? 'Morning daylight' : 'Afternoon daylight';
  if (altitude >= -0.833) return morning ? 'Sunrise' : 'Sunset';
  if (altitude >= -6) return morning ? 'Civil dawn' : 'Civil dusk';
  if (altitude >= -12) return morning ? 'Nautical dawn' : 'Nautical dusk';
  if (altitude >= -18) return morning ? 'Astronomical dawn' : 'Astronomical dusk';
  return 'Night';
}

// ZIP code database (common US locations)
const ZIP_CODE_DATABASE = {
  '10001': { name: 'New York, NY', lat: 40.7484, lng: -73.9967 },
  '90001': { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  '60601': { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  '75201': { name: 'Dallas, TX', lat: 32.7767, lng: -96.7970 },
  '77001': { name: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  '85001': { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.0742 },
  '19101': { name: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652 },
  '19342': { name: 'West Chester, PA', lat: 39.9589, lng: -75.4765 },
  '78201': { name: 'San Antonio, TX', lat: 29.4241, lng: -98.4936 },
  '92101': { name: 'San Diego, CA', lat: 32.7157, lng: -117.1611 },
  '75601': { name: 'Dallas, TX', lat: 32.7767, lng: -96.7970 },
  '94101': { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  '98101': { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
  '80202': { name: 'Denver, CO', lat: 39.7392, lng: -104.9903 },
  '20001': { name: 'Washington, DC', lat: 38.9072, lng: -77.0369 },
  '02134': { name: 'Boston, MA', lat: 42.3601, lng: -71.0589 },
  '30301': { name: 'Atlanta, GA', lat: 33.7490, lng: -84.3880 },
  '33101': { name: 'Miami, FL', lat: 25.7617, lng: -80.1918 },
  '48201': { name: 'Detroit, MI', lat: 42.3314, lng: -83.0458 },
  '55401': { name: 'Minneapolis, MN', lat: 44.9778, lng: -93.2650 },
  '63101': { name: 'St. Louis, MO', lat: 38.6270, lng: -90.1994 },
};

async function getLocationFromZip(zip) {
  if (ZIP_CODE_DATABASE[zip]) return ZIP_CODE_DATABASE[zip];
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    if (data.length > 0) {
      const result = data[0];
      return {
        name: result.address?.city ? `${result.address.city}, ${result.address.state || ''}` : 'Location found',
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };
    }
    return null;
  } catch (error) {
    console.warn('Geolocation lookup failed:', error);
    return null;
  }
}

let homeLocation = null;

function setCameraToLocation(lat, lng) {
  const latRad = lat * DEG;
  const lngRad = lng * DEG;
  const distance = 4.15;
  const height = Math.sin(latRad) * distance;
  const radius = Math.cos(latRad) * distance;
  camera.position.set(
    Math.cos(lngRad) * radius,
    height,
    Math.sin(lngRad) * radius
  );
  controls.target.set(0, 0, 0);
  controls.update();
}

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------
const element = (id) => document.getElementById(id);
const stage = element('stage');
const loading = element('loading');
const loadingTitle = element('loading-title');
const loadingDetail = element('loading-detail');
const fatal = element('fatal');
const fatalMessage = element('fatal-message');
const localTimeElement = element('local-time');
const localDateElement = element('local-date');
const utcTimeElement = element('utc-time');
const solarPositionElement = element('solar-position');
const modeBadge = element('mode-badge');
const controlState = element('control-state');
const controlPanel = element('control-panel');
const controlsToggle = element('controls-toggle');
const controlsClose = element('controls-close');
const fullscreenButton = element('fullscreen');
const nowButton = element('now');
const dateInput = element('date-input');
const scrubber = element('scrub');
const scrubLabel = element('scrub-label');
const tip = element('tip');
const hint = element('hint');
const zipInput = element('zip-input');
const homeButton = element('home-button');
const resetHomeButton = element('reset-home-button');
const locationDisplay = element('location-display');
const dawnInfoButton = element('dawn-info-button');
const dawnModal = element('dawn-modal');
const dawnModalClose = element('dawn-modal-close');

const localTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: undefined,
});
const localDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const utcTimeFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function showFatal(error) {
  console.error(error);
  loading.hidden = true;
  fatal.hidden = false;
  fatalMessage.textContent = error instanceof Error ? error.message : String(error);
}

function setLoading(title, detail) {
  loadingTitle.textContent = title;
  loadingDetail.textContent = detail;
}

function finishLoading(detail = '') {
  if (detail) loadingDetail.textContent = detail;
  window.setTimeout(() => {
    loading.classList.add('hide');
    window.setTimeout(() => loading.remove(), 550);
  }, detail ? 1100 : 120);
}

// -----------------------------------------------------------------------------
// Renderer and scene
// -----------------------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
} catch (error) {
  showFatal(new Error('WebGL is unavailable. Dawnline needs hardware-accelerated browser graphics.'));
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(...CONFIG.defaultCamera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 1.65;
controls.maxDistance = 10;
controls.enablePan = false;
controls.rotateSpeed = 0.48;
controls.zoomSpeed = 0.75;
controls.autoRotateSpeed = 0.16;

const sceneLayers = {
  stars: null,
  earth: null,
  clouds: null,
  atmosphere: null,
};

function createStarfield() {
  const geometry = new THREE.BufferGeometry();
  const count = 4200;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 55 + Math.random() * 35;
    const azimuth = Math.random() * Math.PI * 2;
    const polar = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(polar) * Math.cos(azimuth);
    positions[index * 3 + 1] = radius * Math.cos(polar);
    positions[index * 3 + 2] = radius * Math.sin(polar) * Math.sin(azimuth);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xb7c3d6,
    size: 0.085,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

sceneLayers.stars = createStarfield();
scene.add(sceneLayers.stars);

const sharedSunDirection = new THREE.Vector3(1, 0, 0);

const earthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    dayMap: { value: null },
    nightMap: { value: null },
    sunDir: { value: sharedSunDirection },
    nightBoost: { value: CONFIG.nightBoost },
    nightLightsEnabled: { value: 1.0 },
    twilightStrength: { value: CONFIG.twilightStrength },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
      vUv = uv;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform vec3 sunDir;
    uniform float nightBoost;
    uniform float nightLightsEnabled;
    uniform float twilightStrength;
    varying vec2 vUv;
    varying vec3 vWorldNormal;

    void main() {
      float sunlight = dot(normalize(vWorldNormal), normalize(sunDir));
      vec3 dayColor = texture2D(dayMap, vUv).rgb;
      vec3 cityLights = texture2D(nightMap, vUv).rgb * nightBoost;
      vec3 unlitSurface = dayColor * 0.022;
      vec3 nightColor = mix(unlitSurface, cityLights, nightLightsEnabled);

      float dayMix = smoothstep(-0.10, 0.15, sunlight);
      vec3 color = mix(nightColor, dayColor, dayMix);

      float astronomical = exp(-pow((sunlight + 0.285) / 0.052, 2.0));
      float nautical = exp(-pow((sunlight + 0.185) / 0.052, 2.0));
      float civil = exp(-pow((sunlight + 0.083) / 0.048, 2.0));
      float horizon = exp(-pow(sunlight / 0.038, 2.0));

      color += twilightStrength * vec3(0.12, 0.19, 0.54) * astronomical * 0.34;
      color += twilightStrength * vec3(0.52, 0.24, 0.68) * nautical * 0.43;
      color += twilightStrength * vec3(1.00, 0.46, 0.16) * civil * 0.68;
      color += twilightStrength * vec3(1.00, 0.73, 0.31) * horizon * 0.52;

      color *= 0.88 + 0.22 * max(sunlight, 0.0);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

sceneLayers.earth = new THREE.Mesh(
  new THREE.SphereGeometry(1, CONFIG.earthSegments, CONFIG.earthSegments),
  earthMaterial,
);
scene.add(sceneLayers.earth);

const cloudMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    cloudMap: { value: null },
    sunDir: { value: sharedSunDirection },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
      vUv = uv;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D cloudMap;
    uniform vec3 sunDir;
    varying vec2 vUv;
    varying vec3 vWorldNormal;

    void main() {
      float cloudDensity = texture2D(cloudMap, vUv).r;
      if (cloudDensity < 0.045) discard;

      float sunlight = dot(normalize(vWorldNormal), normalize(sunDir));
      float lit = smoothstep(-0.16, 0.25, sunlight);
      vec3 color = mix(vec3(0.035, 0.04, 0.085), vec3(1.0), lit);
      float terminator = exp(-pow(sunlight / 0.10, 2.0));
      color += vec3(1.0, 0.52, 0.31) * terminator * 0.30;
      float alpha = cloudDensity * (0.28 + 0.57 * lit);
      gl_FragColor = vec4(color, alpha);
    }
  `,
});

sceneLayers.clouds = new THREE.Mesh(
  new THREE.SphereGeometry(1.008, CONFIG.cloudSegments, CONFIG.cloudSegments),
  cloudMaterial,
);
scene.add(sceneLayers.clouds);

const atmosphereMaterial = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.BackSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  uniforms: { sunDir: { value: sharedSunDirection } },
  vertexShader: `
    varying vec3 vWorldNormal;
    varying vec3 vViewNormal;
    void main() {
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vViewNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 sunDir;
    varying vec3 vWorldNormal;
    varying vec3 vViewNormal;
    void main() {
      float rim = pow(1.0 - abs(vViewNormal.z), 2.7);
      float sunlight = dot(normalize(vWorldNormal), normalize(sunDir));
      float dayWeight = smoothstep(-0.18, 0.35, sunlight);
      float dawnWeight = exp(-pow((sunlight + 0.02) / 0.18, 2.0));
      vec3 blue = vec3(0.18, 0.42, 0.92) * dayWeight;
      vec3 warm = vec3(1.00, 0.42, 0.17) * dawnWeight * 0.72;
      vec3 color = blue + warm;
      float alpha = rim * (0.18 + 0.46 * max(dayWeight, dawnWeight));
      gl_FragColor = vec4(color, alpha);
    }
  `,
});

sceneLayers.atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.07, CONFIG.cloudSegments, CONFIG.cloudSegments),
  atmosphereMaterial,
);
scene.add(sceneLayers.atmosphere);

// -----------------------------------------------------------------------------
// Local assets
// -----------------------------------------------------------------------------
const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

function loadTexture(path, { srgb = false } = {}) {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = maxAnisotropy;
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`Could not load ${path}`)),
    );
  });
}

function fallbackTexture(lightColor, darkColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, lightColor);
  gradient.addColorStop(0.5, darkColor);
  gradient.addColorStop(1, lightColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

async function loadAssets() {
  const requests = [
    ['day', 'assets/earth-blue-marble.jpg', { srgb: true }],
    ['night', 'assets/earth-night.jpg', { srgb: true }],
    ['cloud', 'assets/clouds.png', { srgb: false }],
  ];
  const results = await Promise.allSettled(
    requests.map(([, path, options]) => loadTexture(path, options)),
  );
  const failures = [];
  const textures = {};
  results.forEach((result, index) => {
    const [name, path] = requests[index];
    if (result.status === 'fulfilled') textures[name] = result.value;
    else failures.push(path);
  });

  earthMaterial.uniforms.dayMap.value = textures.day || fallbackTexture('#5078a0', '#28445d');
  earthMaterial.uniforms.nightMap.value = textures.night || fallbackTexture('#07101d', '#02040a');
  if (textures.cloud) cloudMaterial.uniforms.cloudMap.value = textures.cloud;
  else sceneLayers.clouds.visible = false;

  return failures;
}

// -----------------------------------------------------------------------------
// Clock state
// -----------------------------------------------------------------------------
const clock = {
  time: new Date(),
  live: true,
  speed: 1,
  speedBeforePause: 1,
  lastFrameMs: performance.now(),
  lastHudUpdateMs: 0,
  lastInputSyncMs: 0,
};

function setClockMode({ live = clock.live, speed = clock.speed } = {}) {
  clock.live = live;
  clock.speed = speed;
  if (speed > 0) clock.speedBeforePause = speed;
  updateControlState();
  updateSpeedButtons();
}

function returnToNow() {
  clock.time = new Date();
  setClockMode({ live: true, speed: 1 });
  syncInputs(true);
}

function pauseClock() {
  setClockMode({ live: false, speed: 0 });
}

function togglePause() {
  if (clock.live || clock.speed > 0) pauseClock();
  else setClockMode({ live: false, speed: clock.speedBeforePause || 1 });
}

function updateControlState() {
  modeBadge.classList.toggle('live', clock.live);
  modeBadge.textContent = clock.live ? 'LIVE' : clock.speed === 0 ? 'PAUSED' : `${formatSpeed(clock.speed)}`;
  if (clock.live) controlState.textContent = 'Following the current time';
  else if (clock.speed === 0) controlState.textContent = 'Simulation paused';
  else controlState.textContent = `Simulation running at ${formatSpeed(clock.speed)}`;
}

function formatSpeed(speed) {
  if (speed === 1800) return '30 MIN/S';
  if (speed === 14400) return '4 HR/S';
  return `${speed}×`;
}

function updateSpeedButtons() {
  document.querySelectorAll('[data-speed]').forEach((button) => {
    const buttonSpeed = Number(button.dataset.speed);
    button.classList.toggle('active', !clock.live && clock.speed === buttonSpeed);
  });
  nowButton.classList.toggle('active', clock.live);
}

function syncInputs(force = false) {
  const nowMs = performance.now();
  if (!force && nowMs - clock.lastInputSyncMs < CONFIG.inputSyncMs) return;
  clock.lastInputSyncMs = nowMs;
  const year = clock.time.getUTCFullYear();
  const month = String(clock.time.getUTCMonth() + 1).padStart(2, '0');
  const day = String(clock.time.getUTCDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;
  const seconds =
    clock.time.getUTCHours() * 3600 +
    clock.time.getUTCMinutes() * 60 +
    clock.time.getUTCSeconds();
  scrubber.value = String(seconds);
  scrubLabel.textContent = `Time of day (UTC) — ${formatUtcClock(clock.time)}`;
}

function formatUtcClock(date) {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
}

function updateHud(force = false) {
  const nowMs = performance.now();
  if (!force && nowMs - clock.lastHudUpdateMs < CONFIG.hudUpdateMs) return;
  clock.lastHudUpdateMs = nowMs;
  const solar = sunPosition(clock.time);
  localTimeElement.textContent = localTimeFormatter.format(clock.time);
  localDateElement.textContent = localDateFormatter.format(clock.time);
  utcTimeElement.textContent = `${utcTimeFormatter.format(clock.time)} UTC`;
  solarPositionElement.textContent = `Sun over ${formatLongitude(solar.subsolarLongitude)}, ${formatLatitude(solar.declination)}`;
}

function formatLongitude(radians) {
  const degrees = radians * RAD;
  return `${Math.abs(degrees).toFixed(1)}° ${degrees >= 0 ? 'E' : 'W'}`;
}

function formatLatitude(radians) {
  const degrees = radians * RAD;
  return `${Math.abs(degrees).toFixed(1)}° ${degrees >= 0 ? 'N' : 'S'}`;
}

// -----------------------------------------------------------------------------
// Controls and interaction
// -----------------------------------------------------------------------------
function setControlsOpen(open) {
  controlPanel.hidden = !open;
  controlsToggle.setAttribute('aria-expanded', String(open));
  controlsToggle.classList.toggle('active', open);
}

controlsToggle.addEventListener('click', () => setControlsOpen(controlPanel.hidden));
controlsClose.addEventListener('click', () => setControlsOpen(false));

fullscreenButton.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch (error) {
    console.warn('Fullscreen unavailable', error);
  }
});

document.querySelectorAll('[data-speed]').forEach((button) => {
  button.addEventListener('click', () => {
    const speed = Number(button.dataset.speed);
    setClockMode({ live: false, speed });
  });
});

nowButton.addEventListener('click', returnToNow);

// Location features
homeButton.addEventListener('click', async () => {
  const zip = zipInput.value.trim();
  if (!zip) {
    locationDisplay.hidden = true;
    return;
  }
  homeButton.disabled = true;
  locationDisplay.textContent = 'Looking up location...';
  locationDisplay.hidden = false;

  const location = await getLocationFromZip(zip);
  homeButton.disabled = false;

  if (location) {
    homeLocation = location;
    setCameraToLocation(location.lat, location.lng);
    locationDisplay.textContent = `Home: ${location.name}`;
  } else {
    locationDisplay.textContent = 'ZIP code not found';
  }
});

resetHomeButton.addEventListener('click', () => {
  if (homeLocation) {
    setCameraToLocation(homeLocation.lat, homeLocation.lng);
  } else {
    camera.position.set(...CONFIG.defaultCamera);
    controls.target.set(0, 0, 0);
    controls.update();
  }
});

zipInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') homeButton.click();
});

const rotationIndicator = element('rotation-indicator');
const autoRotateCheckbox = element('auto-rotate');
if (autoRotateCheckbox && rotationIndicator) {
  autoRotateCheckbox.addEventListener('change', () => {
    rotationIndicator.classList.toggle('active', autoRotateCheckbox.checked);
  });
  rotationIndicator.classList.toggle('active', autoRotateCheckbox.checked);
}

// Dawn info modal
dawnInfoButton.addEventListener('click', () => {
  dawnModal.hidden = false;
});

dawnModalClose.addEventListener('click', () => {
  dawnModal.hidden = true;
});

dawnModal.addEventListener('click', (e) => {
  if (e.target === dawnModal) dawnModal.hidden = true;
});

dateInput.addEventListener('change', () => {
  const [year, month, day] = dateInput.value.split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return;
  const updated = new Date(clock.time);
  updated.setUTCFullYear(year, month - 1, day);
  clock.time = updated;
  pauseClock();
  syncInputs(true);
  updateHud(true);
});

scrubber.addEventListener('input', () => {
  const seconds = Number(scrubber.value);
  const updated = new Date(clock.time);
  updated.setUTCHours(0, 0, 0, 0);
  updated.setUTCSeconds(seconds);
  clock.time = updated;
  pauseClock();
  syncInputs(true);
  updateHud(true);
});

const layerBindings = [
  ['layer-stars', (checked) => { sceneLayers.stars.visible = checked; }],
  ['layer-lights', (checked) => { earthMaterial.uniforms.nightLightsEnabled.value = checked ? 1 : 0; }],
  ['layer-twilight', (checked) => { earthMaterial.uniforms.twilightStrength.value = checked ? CONFIG.twilightStrength : 0; }],
  ['layer-clouds', (checked) => { sceneLayers.clouds.visible = checked && Boolean(cloudMaterial.uniforms.cloudMap.value); }],
  ['layer-atmosphere', (checked) => { sceneLayers.atmosphere.visible = checked; }],
  ['auto-rotate', (checked) => { controls.autoRotate = checked; }],
];
layerBindings.forEach(([id, apply]) => {
  const input = element(id);
  input.addEventListener('change', () => apply(input.checked));
});

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
  } else if (event.key.toLowerCase() === 'n') {
    returnToNow();
  } else if (event.key.toLowerCase() === 'c') {
    setControlsOpen(controlPanel.hidden);
  } else if (event.key === 'Escape') {
    tip.hidden = true;
    setControlsOpen(false);
  }
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('click', (event) => {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(sceneLayers.earth);
  if (!hits.length) {
    tip.hidden = true;
    return;
  }

  const point = hits[0].point.clone();
  sceneLayers.earth.worldToLocal(point);
  point.normalize();
  const latitude = Math.asin(point.y) * RAD;
  const longitude = Math.atan2(-point.z, point.x) * RAD;
  const altitude = sunAltitudeDegrees(latitude, longitude, clock.time);
  const phase = lightPhase(altitude, hourAngle(longitude, clock.time));

  tip.innerHTML = `
    <b>${formatCoordinate(latitude, 'N', 'S')}, ${formatCoordinate(longitude, 'E', 'W')}</b><br>
    Sun altitude: <b>${altitude.toFixed(1)}°</b>
    <div class="phase">${phase}</div>
  `;
  tip.hidden = false;
  const left = Math.min(event.clientX + 13, window.innerWidth - 285);
  const top = Math.min(event.clientY + 13, window.innerHeight - 105);
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${Math.max(8, top)}px`;
});

function formatCoordinate(value, positiveHemisphere, negativeHemisphere) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positiveHemisphere : negativeHemisphere}`;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.setTimeout(() => hint.classList.add('fade'), 8000);

// -----------------------------------------------------------------------------
// Animation
// -----------------------------------------------------------------------------
function animate(frameMs) {
  const elapsedSeconds = Math.min((frameMs - clock.lastFrameMs) / 1000, 0.25);
  clock.lastFrameMs = frameMs;

  if (clock.live) clock.time = new Date();
  else if (clock.speed > 0) clock.time = new Date(clock.time.getTime() + elapsedSeconds * 1000 * clock.speed);

  sharedSunDirection.copy(sunDirection(clock.time));
  sceneLayers.clouds.rotation.y += elapsedSeconds * CONFIG.cloudRotationRadiansPerSecond;

  updateHud();
  syncInputs();
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

async function start() {
  try {
    setLoading('Starting Dawnline', 'Loading the local Earth textures…');
    const failedAssets = await loadAssets();
    returnToNow();
    updateHud(true);
    updateControlState();
    updateSpeedButtons();
    if (failedAssets.length) {
      finishLoading(`Running with fallback graphics; missing: ${failedAssets.join(', ')}`);
    } else {
      finishLoading();
    }
    window.requestAnimationFrame(animate);
  } catch (error) {
    showFatal(error);
  }
}

start();
