/**
 * ==============================================================================
 * CLIMATE FORECAST - CORE CONTROLLER ENGINE
 * ==============================================================================
 * 
 * Architecture:
 * - Three.js WebGL Photorealistic NASA Satellite 3D Earth with Spherical Locator
 * - Synchronous Open-Meteo Synoptic Forecast & Air Quality Telemetry
 * - Outdoor Running Viability & Atmospheric Stress Engine
 * - Debounced Geocoding Autocomplete with Mobile Keyboard Auto-Dismissal
 * - Dual Theme Switcher (Default: Day Mode) & Network Buffering Sentinel
 * ==============================================================================
 */

'use strict';

/* ==========================================================================
   1. GLOBAL STATE & CONFIGURATION
   ========================================================================== */
const APP_CONFIG = {
  defaultLocation: {
    name: 'New Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090
  },
  // Endpoints using user-specified parameter structure
  apiEndpoints: {
    forecastBase: 'https://api.open-meteo.com/v1/forecast',
    airQualityBase: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    geocodingBase: 'https://geocoding-api.open-meteo.com/v1/search',
    reverseGeocodingBase: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
  },
  // NASA Blue Marble Photorealistic Textures
  textures: {
    earthDay: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_atmos_2048.jpg',
    earthSpecular: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_specular_2048.jpg',
    earthClouds: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/planets/earth_clouds_1024.png'
  },
  debounceDelay: 300
};

const appState = {
  currentTheme: 'day', // POINT 3: Default Day Mode
  currentLocation: { ...APP_CONFIG.defaultLocation },
  threeGlobe: null,
  isSearching: false,
  telemetryRequestId: 0
};

/* ==========================================================================
   2. DOM ELEMENT REGISTRY
   ========================================================================== */
const DOM = {
  html: document.documentElement,
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  
  // POINT 8: Welcome Splash & Overlays
  welcomeSplash: document.getElementById('welcome-splash'),
  locationModal: document.getElementById('location-modal'),
  closeLocationModal: document.getElementById('close-location-modal'),
  enableLocationBtn: document.getElementById('enable-location-btn'),
  locationModalStatus: document.getElementById('location-modal-status'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettingsBtn: document.getElementById('close-settings-btn'),
  globalLoader: document.getElementById('global-loader'),
  loaderStatus: document.getElementById('loader-status'),
  offlineBanner: document.getElementById('offline-banner'),
  offlineRetryBtn: document.getElementById('offline-retry-btn'),

  // POINT 10 & 11: Search Engine
  searchForm: document.getElementById('weather-search-form'),
  searchInput: document.getElementById('city-search-input'),
  searchSuggestions: document.getElementById('search-suggestions'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  // POINT 7.c & 12: 3D Earth Containers
  globeContainer: document.getElementById('globe-3d-container'),
  targetCoordsBadge: document.getElementById('target-coords'),
  markerCityDisplay: document.getElementById('marker-city-display'),
  markerTempDisplay: document.getElementById('marker-temp-display'),

  // POINT 7.a: Hero Weather
  locationName: document.getElementById('selected-location-name'),
  observationTime: document.getElementById('observation-timestamp'),
  currentTemp: document.getElementById('current-temp-val'),
  weatherIcon: document.getElementById('weather-condition-icon'),
  weatherDesc: document.getElementById('weather-description-text'),
  tempHighLow: document.getElementById('temp-high-low'),
  climateStatus: document.getElementById('climate-status-badge'),
  visibilityMetric: document.getElementById('visibility-metric'),

  // Sunrise / Sunset Card
  sunriseVal: document.getElementById('sunrise-val'),
  sunsetVal: document.getElementById('sunset-val'),
  daylightText: document.getElementById('daylight-duration-text'),

  // Running Status Card
  runningBadge: document.getElementById('running-status-badge'),
  runningStatusText: document.getElementById('running-status-text'),
  runningStatusDesc: document.getElementById('running-status-desc'),
  thermalFactor: document.getElementById('thermal-factor'),
  rainFactor: document.getElementById('rain-factor'),
  respirationFactor: document.getElementById('respiration-factor'),

  // POINT 7.b, 7.d, 7.e: Secondary Telemetry
  humidityVal: document.getElementById('humidity-val'),
  humidityBar: document.getElementById('humidity-bar-fill'),
  humidityRemark: document.getElementById('humidity-remark'),
  windVal: document.getElementById('wind-val'),
  windCompass: document.getElementById('wind-compass-needle'),
  windDirection: document.getElementById('wind-direction-text'),
  windRemark: document.getElementById('wind-remark'),
  pressureVal: document.getElementById('pressure-val'),
  pressureRemark: document.getElementById('pressure-remark'),
  pressurePills: document.querySelectorAll('.scale-point'),
  uvIndexVal: document.getElementById('uv-index-val'),
  uvBarFill: document.getElementById('uv-bar-fill'),
  uvRemark: document.getElementById('uv-remark'),

  // POINT 7.h: AQI Telemetry
  aqiVal: document.getElementById('aqi-val'),
  aqiBadge: document.getElementById('aqi-badge-color'),
  aqiCategory: document.getElementById('aqi-category-title'),
  aqiAdvisory: document.getElementById('aqi-advisory'),
  pm25Val: document.getElementById('pm25-val'),
  pm10Val: document.getElementById('pm10-val'),
  ozoneVal: document.getElementById('ozone-val'),

  // POINT 7.g: Forecast Container
  forecastContainer: document.getElementById('forecast-7day-container')
};

/* ==========================================================================
   3. WMO SYNOPTIC WEATHER MAPPER
   ========================================================================== */
const WMO_DATA = {
  0: { label: 'Clear Sky', icon: 'sun', status: 'Optimal' },
  1: { label: 'Mainly Clear', icon: 'sun-medium', status: 'Optimal' },
  2: { label: 'Partly Cloudy', icon: 'cloud-sun', status: 'Moderate' },
  3: { label: 'Overcast Skies', icon: 'cloud', status: 'Overcast' },
  45: { label: 'Dense Fog', icon: 'cloud-fog', status: 'Caution' },
  48: { label: 'Depositing Rime Fog', icon: 'cloud-fog', status: 'Caution' },
  51: { label: 'Light Drizzle', icon: 'cloud-drizzle', status: 'Precipitation' },
  53: { label: 'Moderate Drizzle', icon: 'cloud-drizzle', status: 'Precipitation' },
  55: { label: 'Dense Drizzle', icon: 'cloud-drizzle', status: 'Precipitation' },
  61: { label: 'Slight Rain', icon: 'cloud-rain', status: 'Wet Surface' },
  63: { label: 'Moderate Rain', icon: 'cloud-rain', status: 'Wet Surface' },
  65: { label: 'Heavy Downpour', icon: 'cloud-rain-wind', status: 'Storm Warning' },
  71: { label: 'Slight Snow', icon: 'cloud-snow', status: 'Freezing' },
  73: { label: 'Moderate Snow', icon: 'snowflake', status: 'Freezing' },
  75: { label: 'Heavy Blizzard', icon: 'snowflake', status: 'Hazard' },
  80: { label: 'Passing Showers', icon: 'cloud-hail', status: 'Showers' },
  81: { label: 'Moderate Showers', icon: 'cloud-hail', status: 'Showers' },
  82: { label: 'Violent Showers', icon: 'cloud-lightning', status: 'Severe' },
  95: { label: 'Thunderstorm', icon: 'zap', status: 'Severe Alert' },
  96: { label: 'Thunderstorm w/ Hail', icon: 'cloud-lightning', status: 'Hazard' },
  99: { label: 'Severe Thunderstorm', icon: 'zap-off', status: 'Hazard' }
};

function getWmoDetails(code) {
  return WMO_DATA[code] || { label: 'Atmospheric Variance', icon: 'cloud', status: 'Stable' };
}

/* ==========================================================================
   4. THREE.JS HYPER-REALISTIC 3D EARTH (POINT 7.c & 12)
   ========================================================================== */
class HyperRealisticGlobe {
  constructor(container) {
    this.container = container;
    this.radius = 1.85;
    this.targetQuaternion = new THREE.Quaternion();
    this.autoRotateAxis = new THREE.Vector3(0, 1, 0);
    this.isInterpolating = false;
    this.userInteracting = false;
    this.holdAtTarget = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.init();
  }

  init() {
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 380;

    // Scene & Perspective Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    this.camera.position.z = 5.2;

    // WebGL Renderer with ACES Tone Mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Realistic Lighting Architecture
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    sunLight.position.set(5, 3.5, 4.5);
    this.scene.add(sunLight);

    this.earthGroup = new THREE.Group();
    this.scene.add(this.earthGroup);

    // Load NASA Satellite Textures
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    const earthMap = loader.load(APP_CONFIG.textures.earthDay);
    const specularMap = loader.load(APP_CONFIG.textures.earthSpecular);
    const cloudsMap = loader.load(APP_CONFIG.textures.earthClouds);

    // 1. Earth Solid Sphere Mesh
    const earthGeo = new THREE.SphereGeometry(this.radius, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthMap,
      specularMap: specularMap,
      specular: new THREE.Color(0x334455),
      shininess: 18
    });
    this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.earthGroup.add(this.earthMesh);

    // 2. Realistic Cloud Atmosphere Shell
    const cloudsGeo = new THREE.SphereGeometry(this.radius * 1.018, 64, 64);
    const cloudsMat = new THREE.MeshLambertMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending
    });
    this.cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    this.earthGroup.add(this.cloudsMesh);

    // 3. Atmospheric Outer Fresnel Glow Shell
    const atmosphereGeo = new THREE.SphereGeometry(this.radius * 1.09, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.24, 0.68, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    this.earthGroup.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));

    // 4. Geolocation Target Pin & Pulse Beacon
    this.buildMarker();
    this.bindEvents();
    this.animate();
  }

  buildMarker() {
    this.markerGroup = new THREE.Group();
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3b30 })
    );
    this.markerGroup.add(beacon);

    this.markerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.065, 0.095, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    this.markerGroup.add(this.markerRing);
    this.earthMesh.add(this.markerGroup);
  }

  /* POINT 12: Spherical Coordinate Rotation to Searched Location */
  rotateToCoordinates(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(this.radius * Math.sin(phi) * Math.cos(theta));
    const z = (this.radius * Math.sin(phi) * Math.sin(theta));
    const y = (this.radius * Math.cos(phi));

    this.markerGroup.position.set(x, y, z);
    this.markerGroup.lookAt(new THREE.Vector3(x * 2, y * 2, z * 2));

    const targetDirection = new THREE.Vector3(x, y, z).normalize();
    const cameraDirection = new THREE.Vector3(0, 0, 1);
    this.targetQuaternion.setFromUnitVectors(targetDirection, cameraDirection);
    this.isInterpolating = true;
    this.holdAtTarget = false;
  }

  bindEvents() {
    const el = this.container;
    
    // Mouse Interaction
    el.addEventListener('mousedown', (e) => {
      this.userInteracting = true;
      this.isInterpolating = false;
      this.holdAtTarget = false;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { this.userInteracting = false; });
    el.addEventListener('mousemove', (e) => {
      if (!this.userInteracting) return;
      this.earthGroup.rotation.y += (e.clientX - this.prevMousePos.x) * 0.005;
      this.earthGroup.rotation.x += (e.clientY - this.prevMousePos.y) * 0.005;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    // Mobile / Tablet Touch Interaction
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.userInteracting = true;
        this.isInterpolating = false;
        this.holdAtTarget = false;
        this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (!this.userInteracting || e.touches.length !== 1) return;
      this.earthGroup.rotation.y += (e.touches[0].clientX - this.prevMousePos.x) * 0.006;
      this.earthGroup.rotation.x += (e.touches[0].clientY - this.prevMousePos.y) * 0.006;
      this.prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    window.addEventListener('touchend', () => { this.userInteracting = false; });

    // Responsive Resize Listener
    window.addEventListener('resize', () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.cloudsMesh) this.cloudsMesh.rotation.y += 0.0007;

    if (this.markerRing) {
      const pulse = 1 + Math.sin(Date.now() * 0.007) * 0.35;
      this.markerRing.scale.set(pulse, pulse, 1);
    }

    // POINT 12: Smooth Rotation & Precision Stopping
    if (this.isInterpolating) {
      this.earthGroup.quaternion.slerp(this.targetQuaternion, 0.06);

      if (this.earthGroup.quaternion.angleTo(this.targetQuaternion) < 0.001) {
        this.earthGroup.quaternion.copy(this.targetQuaternion);
        this.isInterpolating = false;
      }
    } else if (!this.userInteracting && !this.holdAtTarget) {
      this.earthGroup.rotateOnWorldAxis(this.autoRotateAxis, 0.0009);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/* ==========================================================================
   5. RUNNING & OUTDOOR FITNESS VIABILITY ENGINE
   ========================================================================== */
function calculateRunningViability(temp, humidity, rainMm, aqi, windSpeed) {
  let score = 100;
  let status = 'Optimal for Running';
  let pillClass = 'optimal';
  let desc = 'Atmospheric conditions are ideal for outdoor running and athletic training.';
  
  // Thermal Strain
  let thermal = 'Optimal';
  if (temp > 32) { score -= 35; thermal = 'High Heat Stress'; }
  else if (temp > 27) { score -= 15; thermal = 'Warm'; }
  else if (temp < 5) { score -= 20; thermal = 'Cold Stress'; }

  // Precipitation & Traction
  let rainFactor = 'Dry Surface';
  if (rainMm > 2) { score -= 40; rainFactor = 'Heavy Rain / Slick Roads'; }
  else if (rainMm > 0) { score -= 20; rainFactor = 'Damp / Light Rain'; }

  // Respiration & AQI
  let respiration = 'Clean Air';
  if (aqi > 150) { score -= 50; respiration = 'Hazardous Respiration'; }
  else if (aqi > 100) { score -= 25; respiration = 'Sensitive Alert'; }
  else if (aqi > 50) { respiration = 'Moderate'; }

  if (windSpeed > 30) score -= 15;

  if (score >= 80) {
    status = 'Optimal for Running';
    pillClass = 'optimal';
    desc = 'Great weather! Outdoor athletic exertion and distance running recommended.';
  } else if (score >= 50) {
    status = 'Caution Advised';
    pillClass = 'caution';
    desc = 'Moderate weather stress. Pace yourself, stay hydrated, and monitor air quality.';
  } else {
    status = 'Avoid Outdoor Running';
    pillClass = 'hazard';
    desc = 'Unfavorable running conditions. Treadmill or indoor cardio workout advised.';
  }

  return { status, pillClass, desc, thermal, rainFactor, respiration };
}

/* ==========================================================================
   7. SYNCHRONOUS TELEMETRY PIPELINE (POINT 13 & 15)
   ========================================================================== */
async function fetchCompleteAtmosphericTelemetry(lat, lon, locationName, countryName) {
  const requestId = ++appState.telemetryRequestId;
  appState.currentLocation = { name: locationName, country: countryName, latitude: lat, longitude: lon };
  showGlobalLoader('Accessing Open-Meteo Satellite Networks...');

  try {
    // Dynamic URL construction with exact requested parameters
    const forecastUrl = `${APP_CONFIG.apiEndpoints.forecastBase}?latitude=${lat}&longitude=${lon}&daily=uv_index_max,uv_index_clear_sky_max,sunset,sunrise,daylight_duration,sunshine_duration,weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,rain,precipitation_probability,relative_humidity_2m,showers,visibility,wind_speed_120m,wind_direction_120m,temperature_120m,vapour_pressure_deficit&current=is_day,temperature_2m,relative_humidity_2m,snowfall,precipitation,rain,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code,visibility&timezone=auto`;
    const aqiUrl = `${APP_CONFIG.apiEndpoints.airQualityBase}?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,uv_index,ozone,carbon_dioxide,carbon_monoxide,dust,uv_index_clear_sky&current=ozone,pm2_5,pm10,us_aqi,dust,uv_index,uv_index_clear_sky,aerosol_optical_depth`;

    // POINT 13: Fetch both APIs simultaneously via Promise.all
    const [forecastRes, aqiRes] = await Promise.all([
      fetch(forecastUrl),
      fetch(aqiUrl)
    ]);

    if (!forecastRes.ok || !aqiRes.ok) throw new Error('API transmission error');

    const forecastData = await forecastRes.json();
    const aqiData = await aqiRes.json();

    if (requestId !== appState.telemetryRequestId) return;

    // 1. Update all Dashboard UI Components
    renderTelemetryUI(forecastData, aqiData, locationName, countryName);
    hideOfflineState();

    // 2. POINT 12: Rotate 3D Earth Globe
    if (appState.threeGlobe) {
      appState.threeGlobe.rotateToCoordinates(lat, lon);
    }

    DOM.targetCoordsBadge.textContent = `Target: ${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;

  } catch (error) {
    console.error('Telemetry Acquisition Failure:', error);
    showOfflineAlert();
  } finally {
    if (requestId === appState.telemetryRequestId) hideGlobalLoader();
  }
}

function renderTelemetryUI(forecastData, aqiData, locationName, countryName) {
  const current = forecastData.current || {};
  const daily = forecastData.daily || {};
  const aqiCurrent = aqiData.current || {};
  const wmo = getWmoDetails(current.weather_code);

  // Metadata
  DOM.locationName.textContent = `${locationName}${countryName ? ', ' + countryName : ''}`;
  DOM.observationTime.textContent = `Live Telemetry • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  // Hero Temperature & Condition
  const tempVal = Math.round(current.temperature_2m ?? 24);
  DOM.currentTemp.textContent = tempVal;
  DOM.weatherDesc.textContent = wmo.label;
  DOM.climateStatus.textContent = wmo.status;
  DOM.weatherIcon.innerHTML = `<i data-lucide="${wmo.icon}"></i>`;

  const maxTemp = Math.round(daily.temperature_2m_max?.[0] ?? tempVal + 3);
  const minTemp = Math.round(daily.temperature_2m_min?.[0] ?? tempVal - 4);
  DOM.tempHighLow.textContent = `${maxTemp}° / ${minTemp}°`;

  // POINT 7.f: Visibility / Running Status
  const visKm = ((current.visibility || 10000) / 1000).toFixed(1);
  DOM.visibilityMetric.textContent = `${visKm} km`;

  // Sunrise / Sunset Cycle
  if (daily.sunrise && daily.sunrise[0]) DOM.sunriseVal.textContent = formatIsoTime(daily.sunrise[0]);
  if (daily.sunset && daily.sunset[0]) DOM.sunsetVal.textContent = formatIsoTime(daily.sunset[0]);
  if (daily.daylight_duration && daily.daylight_duration[0]) {
    DOM.daylightText.textContent = `Daylight: ${(daily.daylight_duration[0] / 3600).toFixed(1)} hrs`;
  }

  // Running Status Viability Report
  const rainAmount = current.precipitation || current.rain || 0;
  const aqiScore = aqiCurrent.us_aqi || 42;
  const windVelocity = current.wind_speed_10m || 10;
  const runningReport = calculateRunningViability(tempVal, current.relative_humidity_2m || 50, rainAmount, aqiScore, windVelocity);

  DOM.runningBadge.className = `running-status-pill ${runningReport.pillClass}`;
  DOM.runningStatusText.textContent = runningReport.status;
  DOM.runningStatusDesc.textContent = runningReport.desc;
  DOM.thermalFactor.textContent = runningReport.thermal;
  DOM.rainFactor.textContent = runningReport.rainFactor;
  DOM.respirationFactor.textContent = runningReport.respiration;

  // Secondary Metrics Grid
  // POINT 7.b: Humidity
  const humidity = current.relative_humidity_2m ?? 50;
  DOM.humidityVal.textContent = humidity;
  DOM.humidityBar.style.width = `${humidity}%`;
  DOM.humidityRemark.textContent = humidity > 70 ? 'High Moisture' : 'Comfortable Moisture';

  // POINT 7.d: Wind
  DOM.windVal.textContent = windVelocity.toFixed(1);
  const windDeg = current.wind_direction_10m || 0;
  DOM.windDirection.textContent = `${getCompassSector(windDeg)} (${windDeg}°)`;
  DOM.windCompass.style.transform = `rotate(${windDeg}deg)`;
  DOM.windRemark.textContent = windVelocity > 25 ? 'Brisk Winds' : 'Gentle Breeze';

  // POINT 7.e: Pressure
  const pressure = Math.round(current.surface_pressure || 1013);
  DOM.pressureVal.textContent = pressure;
  updatePressureDisplay(pressure);

  // Solar UV Index
  const uvMax = daily.uv_index_max?.[0] || aqiCurrent.uv_index || 4;
  DOM.uvIndexVal.textContent = uvMax.toFixed(1);
  DOM.uvBarFill.style.width = `${Math.min(uvMax * 9, 100)}%`;
  DOM.uvRemark.textContent = uvMax > 7 ? 'High UV Index' : 'Moderate UV';

  // POINT 7.h: AQI Component
  renderAqiComponent(aqiCurrent);

  // POINT 7.g: 7-Day Synoptic Forecast
  render7DayForecast(daily);

  // Globe Pin Tag Tooltip
  DOM.markerCityDisplay.textContent = locationName;
  DOM.markerTempDisplay.textContent = `${tempVal}°C`;

  // Re-generate Lucide SVG Icons
  lucide.createIcons();
}

function renderAqiComponent(aqiCurrent) {
  const aqi = aqiCurrent.us_aqi || 45;
  DOM.aqiVal.textContent = aqi;

  let label = 'Good Quality';
  let desc = 'Minimal risk for outdoor activity';
  let color = 'var(--accent-success)';

  if (aqi > 200) { label = 'Very Unhealthy'; desc = 'Serious health risk: avoid outdoor exertion'; color = 'var(--accent-danger)'; }
  else if (aqi > 150) { label = 'Unhealthy'; desc = 'Active individuals should avoid outdoor exertion'; color = '#ef4444'; }
  else if (aqi > 100) { label = 'Sensitive Alert'; desc = 'Sensitive groups may experience symptoms'; color = 'var(--accent-warning)'; }
  else if (aqi > 50) { label = 'Moderate Quality'; desc = 'Acceptable air quality for general public'; color = '#eab308'; }

  DOM.aqiCategory.textContent = label;
  DOM.aqiAdvisory.textContent = desc;
  DOM.aqiBadge.style.backgroundColor = color;

  DOM.pm25Val.textContent = `${(aqiCurrent.pm2_5 || 12).toFixed(1)} µg/m³`;
  DOM.pm10Val.textContent = `${(aqiCurrent.pm10 || 26).toFixed(1)} µg/m³`;
  DOM.ozoneVal.textContent = `${(aqiCurrent.ozone || 45).toFixed(1)} µg/m³`;
}

function render7DayForecast(daily) {
  DOM.forecastContainer.innerHTML = '';
  const daysCount = Math.min(daily.time?.length || 7, 7);

  for (let i = 0; i < daysCount; i++) {
    const dateObj = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const wmo = getWmoDetails(daily.weather_code?.[i] || 0);
    const max = Math.round(daily.temperature_2m_max?.[i] ?? 28);
    const min = Math.round(daily.temperature_2m_min?.[i] ?? 18);

    const card = document.createElement('div');
    card.className = 'forecast-day-item';
    card.innerHTML = `
      <span class="forecast-date">${dayName}</span>
      <div class="forecast-icon"><i data-lucide="${wmo.icon}"></i></div>
      <div class="forecast-temps">
        <span class="max-temp">${max}°</span>
        <span class="min-temp">${min}°</span>
      </div>
    `;
    DOM.forecastContainer.appendChild(card);
  }
}

function formatIsoTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updatePressureDisplay(pressure) {
  DOM.pressurePills.forEach(p => p.classList.remove('active'));
  if (pressure < 1005) {
    DOM.pressurePills[0].classList.add('active');
    DOM.pressureRemark.textContent = 'Low Pressure (Cyclone / Storm Alert)';
  } else if (pressure > 1022) {
    DOM.pressurePills[2].classList.add('active');
    DOM.pressureRemark.textContent = 'High Pressure (Dense Dry Atmosphere)';
  } else {
    DOM.pressurePills[1].classList.add('active');
    DOM.pressureRemark.textContent = 'Standard Barometric Equilibrium';
  }
}

function getCompassSector(deg) {
  const sectors = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return sectors[Math.floor((deg / 45) + 0.5) % 8];
}

/* ==========================================================================
   8. AUTOCOMPLETE & KEYBOARD AUTO-DISMISSAL (POINT 10 & 11)
   ========================================================================== */
let searchDebounce = null;
let searchRequestId = 0;

function setupSearchEngine() {
  const selectSuggestion = (place) => {
    DOM.searchInput.value = `${place.name}, ${place.country || ''}`;
    DOM.searchSuggestions.classList.add('hidden');
    DOM.searchInput.blur();
    fetchCompleteAtmosphericTelemetry(place.latitude, place.longitude, place.name, place.country || '');
  };

  DOM.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    const requestId = ++searchRequestId;
    if (query.length >= 2) {
      DOM.clearSearchBtn.classList.remove('hidden');
    } else {
      DOM.clearSearchBtn.classList.add('hidden');
      DOM.searchSuggestions.classList.add('hidden');
      return;
    }
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
      try {
        const url = `${APP_CONFIG.apiEndpoints.geocodingBase}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        
        if (requestId !== searchRequestId) return;
        if (data.results && data.results.length > 0) {
          DOM.searchSuggestions.innerHTML = '';
          data.results.forEach(place => {
            const li = document.createElement('li');
            li.className = 'suggestion-item';
            li.setAttribute('role', 'option');
            const name = document.createElement('span');
            name.className = 'suggestion-name';
            name.textContent = [place.name, place.admin1, place.admin2].filter(Boolean).join(', ');
            const country = document.createElement('span');
            country.className = 'suggestion-country';
            country.textContent = place.country || place.country_code?.toUpperCase() || '';
            li.append(name, country);
            
            li.addEventListener('click', () => {
              selectSuggestion(place);
            });
            
            DOM.searchSuggestions.appendChild(li);
          });
          DOM.searchSuggestions.classList.remove('hidden');
        } else {
          DOM.searchSuggestions.classList.add('hidden');
        }
      } catch (err) {
        console.warn('Geocoding recommendation error:', err);
        showOfflineAlert();
      }
    }, APP_CONFIG.debounceDelay);
  });

  DOM.searchForm.addEventListener('submit', () => {
    const firstSuggestion = DOM.searchSuggestions.querySelector('.suggestion-item');
    if (firstSuggestion) firstSuggestion.click();
  });

  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    DOM.clearSearchBtn.classList.add('hidden');
    DOM.searchSuggestions.classList.add('hidden');
    DOM.searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (!DOM.searchForm.contains(e.target)) {
      DOM.searchSuggestions.classList.add('hidden');
    }
  });
}

function setupSettingsPanel() {
  const closeSettings = () => DOM.settingsModal.classList.add('hidden');
  DOM.settingsBtn.addEventListener('click', () => DOM.settingsModal.classList.remove('hidden'));
  DOM.closeSettingsBtn.addEventListener('click', closeSettings);
  DOM.settingsModal.addEventListener('click', (event) => {
    if (event.target === DOM.settingsModal) closeSettings();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSettings();
  });
}

/* ==========================================================================
   9. CURRENT LOCATION & REVERSE GEOCODING
   ========================================================================== */
function closeLocationPrompt() {
  DOM.locationModal.classList.add('hidden');
}

async function resolveCurrentLocation(position) {
  const { latitude, longitude } = position.coords;
  DOM.locationModalStatus.textContent = 'Finding your city...';

  try {
    const reverseUrl = `${APP_CONFIG.apiEndpoints.reverseGeocodingBase}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const reverseResponse = await fetch(reverseUrl);
    if (!reverseResponse.ok) throw new Error('Reverse geocoding request failed');
    const address = await reverseResponse.json();
    const city = address.city || address.locality || address.principalSubdivision || 'Current location';
    const country = address.countryName || '';

    closeLocationPrompt();
    fetchCompleteAtmosphericTelemetry(latitude, longitude, city, country);
  } catch (error) {
    console.error('Reverse geocoding failure:', error);
    DOM.locationModalStatus.textContent = 'City lookup failed. Loading weather for your coordinates...';
    closeLocationPrompt();
    fetchCompleteAtmosphericTelemetry(latitude, longitude, 'Current location', '');
  }
}

function requestCurrentLocation() {
  if (!navigator.geolocation) {
    DOM.locationModalStatus.textContent = 'Location is not supported by this browser.';
    return;
  }

  DOM.enableLocationBtn.disabled = true;
  DOM.locationModalStatus.textContent = 'Requesting browser permission...';
  navigator.geolocation.getCurrentPosition(
    resolveCurrentLocation,
    (error) => {
      console.warn('Geolocation permission/request failed:', error);
      DOM.enableLocationBtn.disabled = false;
      DOM.locationModalStatus.textContent = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. You can close this prompt and search manually.'
        : 'Unable to detect your location. Please try again.';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
  );
}

function setupLocationPrompt() {
  DOM.closeLocationModal.addEventListener('click', closeLocationPrompt);
  DOM.enableLocationBtn.addEventListener('click', requestCurrentLocation);
}

/* ========================================================================== 
   10. THEME ENGINE (POINT 2 & 3 - DEFAULT DAY MODE)
   ========================================================================== */
function setupThemeEngine() {
  const saved = localStorage.getItem('climate_forecast_theme') || 'day';
  applyTheme(saved);

  DOM.themeToggleBtn.addEventListener('click', () => {
    const next = appState.currentTheme === 'day' ? 'dark' : 'day';
    applyTheme(next);
  });
}

function applyTheme(theme) {
  appState.currentTheme = theme;
  DOM.html.setAttribute('data-theme', theme);
  localStorage.setItem('climate_forecast_theme', theme);
}

/* ==========================================================================
   11. INTRO SPLASH & BUFFERING SENTINEL (POINT 8 & 9)
   ========================================================================== */
function setupWelcomeSplash() {
  // Website load hone par animated gradient "Welcome" 1.8s baad smoothly fade out hota hai
  setTimeout(() => {
    DOM.welcomeSplash.style.opacity = '0';
    setTimeout(() => {
      DOM.welcomeSplash.style.display = 'none';
    }, 600);
  }, 1800);
}

function showGlobalLoader(msg) {
  DOM.loaderStatus.textContent = msg;
  DOM.globalLoader.classList.remove('hidden');
}

function hideGlobalLoader() {
  DOM.globalLoader.classList.add('hidden');
}

function showOfflineAlert() {
  DOM.offlineBanner.classList.remove('hidden');
  lucide.createIcons();
}

function hideOfflineState() {
  DOM.offlineBanner.classList.add('hidden');
}

function retryTelemetry() {
  DOM.offlineRetryBtn.disabled = true;
  DOM.offlineRetryBtn.querySelector('span').textContent = 'Trying...';
  fetchCompleteAtmosphericTelemetry(
    appState.currentLocation.latitude,
    appState.currentLocation.longitude,
    appState.currentLocation.name,
    appState.currentLocation.country
  ).finally(() => {
    DOM.offlineRetryBtn.disabled = false;
    DOM.offlineRetryBtn.querySelector('span').textContent = 'Try again';
  });
}

/* ==========================================================================
   12. APPLICATION BOOTSTRAPPER
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Trigger Animated Welcome Splash Screen
  setupWelcomeSplash();

  // 2. Initialize Theme Engine (Default: Day Mode)
  setupThemeEngine();

  // 3. Set Up Current Location Prompt
  setupLocationPrompt();

  // 4. Set Up Offline Buffering Sentinel
  DOM.offlineRetryBtn.addEventListener('click', retryTelemetry);
  window.addEventListener('offline', showOfflineAlert);
  window.addEventListener('online', () => {
    hideOfflineState();
    fetchCompleteAtmosphericTelemetry(
      appState.currentLocation.latitude, 
      appState.currentLocation.longitude, 
      appState.currentLocation.name, 
      appState.currentLocation.country
    );
  });

  // 5. Initialize Three.js Hyper-Realistic 3D Earth
  try {
    appState.threeGlobe = new HyperRealisticGlobe(DOM.globeContainer);
  } catch (e) {
    console.error('Globe initialization error:', e);
  }

  // 6. Initialize Search Autocomplete & Mobile Dismissal
  setupSearchEngine();
  setupSettingsPanel();

  // 7. Initial Telemetry Synchronization (Default: New Delhi)
  fetchCompleteAtmosphericTelemetry(
    APP_CONFIG.defaultLocation.latitude,
    APP_CONFIG.defaultLocation.longitude,
    APP_CONFIG.defaultLocation.name,
    APP_CONFIG.defaultLocation.country
  );
});