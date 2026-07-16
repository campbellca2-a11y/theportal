# Dawnline Math and Visual Approximations

## Calculated from time

The following are calculated from the selected UTC instant:

- Julian day
- solar mean longitude and anomaly
- ecliptic longitude
- obliquity
- solar right ascension
- solar declination
- Greenwich mean sidereal time
- subsolar longitude
- sun direction in the 3D Earth coordinate system
- solar altitude at a clicked latitude and longitude
- morning-versus-evening state from hour angle

The compact solar-position method agrees with an independent astronomy library to within approximately 0.01 degrees in the validation cases used for this build.

## Twilight boundaries

Dawnline uses the conventional solar-altitude boundaries:

- sunrise/sunset: approximately -0.833 degrees
- civil twilight: 0 to -6 degrees
- nautical twilight: -6 to -12 degrees
- astronomical twilight: -12 to -18 degrees
- night: below -18 degrees

The shader maps those angular regions to the corresponding location on the spherical Earth.

## Visual rather than physically simulated

These are deliberate visual treatments, not a full atmospheric simulation:

- the width, brightness, and color saturation of the twilight bands
- the atmospheric halo
- warm illumination on clouds near the terminator
- star brightness and density
- city-light brightness
- cloud rotation speed

## Not modeled

- atmospheric refraction varying with local weather
- terrain, observer elevation, or horizon obstruction
- Earth oblateness
- moonlight
- seasonal cloud data
- live satellite imagery
- weather
- local civil time zones at clicked coordinates

Dawnline is an accurate solar world clock wrapped in an intentionally expressive visual system. It is not an astronomical observatory package.
