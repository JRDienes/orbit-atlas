import * as THREE from "three";

// ── Realistic Earth: true sun position + day/night shader ───────────────
// REAL view lights the globe from where the sun actually is right now:
// the subsolar point is computed from UTC (solar declination from
// day-of-year + hour angle), and the night hemisphere shows city lights.
// The sun vector lives in the EARTH's frame, so dragging the globe keeps
// the terminator glued to the correct geography.

// Subsolar point (lat/lon where the sun is directly overhead) for a date.
// Ignores the equation of time (±4° ≈ minutes of error — invisible at this
// scale). Returned as a unit vector in earth-LOCAL coordinates matching
// utils/geo.js latLonToXYZ: x=cos(lat)cos(lon), y=sin(lat), z=cos(lat)sin(lon).
export function subsolarLocalDir(date = new Date(), target = new THREE.Vector3()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86400000;
  const declDeg = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lonDeg = (12 - utcHours) * 15; // sun over 0° longitude at 12:00 UTC
  const lat = (declDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return target.set(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  );
}

// Moon direction in earth-local coordinates for a date, using the standard
// low-precision lunar ephemeris (accurate to ~1° — plenty for a globe view).
// Ecliptic lon/lat from mean elements → equatorial RA/dec → earth-fixed
// lat/lon via Greenwich sidereal time → the same local frame as the sun.
// NOTE: rendered distance is stylized; the real Moon sits ~60 Earth radii out.
export function moonLocalDir(date = new Date(), target = new THREE.Vector3()) {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000; // days since J2000
  const rad = Math.PI / 180;
  const L = (218.316 + 13.176396 * d) * rad;  // mean longitude
  const M = (134.963 + 13.064993 * d) * rad;  // mean anomaly
  const F = (93.272 + 13.229350 * d) * rad;   // argument of latitude
  const lam = L + 6.289 * rad * Math.sin(M);  // ecliptic longitude
  const bet = 5.128 * rad * Math.sin(F);      // ecliptic latitude
  const eps = 23.439 * rad;                   // obliquity
  // Ecliptic → equatorial
  const xE = Math.cos(bet) * Math.cos(lam);
  const yE = Math.cos(bet) * Math.sin(lam) * Math.cos(eps) - Math.sin(bet) * Math.sin(eps);
  const zE = Math.cos(bet) * Math.sin(lam) * Math.sin(eps) + Math.sin(bet) * Math.cos(eps);
  const ra = Math.atan2(yE, xE);
  const dec = Math.asin(zE);
  // Equatorial → earth-fixed longitude via Greenwich mean sidereal time
  const gmst = ((280.46061837 + 360.98564736629 * d) % 360) * rad;
  const lon = ra - gmst;
  return target.set(
    Math.cos(dec) * Math.cos(lon),
    Math.sin(dec),
    Math.cos(dec) * Math.sin(lon)
  );
}

// Day/night blend material. `sunDir` is a world-space unit vector updated
// every frame (earth-local subsolar dir transformed by the globe's rotation).
// Day side gets Lambert-ish sunlight; night side fades to the city-lights
// texture across a soft terminator band.
export function createRealEarthMaterial(dayMap, nightMap) {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform vec3 sunDir;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        float d = dot(normalize(vNormalW), normalize(sunDir));
        // Day side: unmistakably sunlit — bright, slight glint near subsolar
        vec3 day = texture2D(dayMap, vUv).rgb * (0.10 + 1.65 * max(d, 0.0));
        // Night side: near-black with bright, clearly-readable city lights
        vec3 lights = pow(texture2D(nightMap, vUv).rgb, vec3(1.1)) * 4.2;
        vec3 night = lights + vec3(0.002, 0.004, 0.010);
        float k = smoothstep(-0.02, 0.25, d); // soft terminator band
        gl_FragColor = vec4(mix(night, day, k), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
