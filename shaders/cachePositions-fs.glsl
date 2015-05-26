precision highp float;

uniform sampler2D uDepthMap;

varying vec2 
  vPos,
  vTexCo;

vec4 z;

void main(void)
{
  // TODO magic numbers
  z = clamp(vec4(texture2D(uDepthMap, vTexCo).z), 0.0, 16.0);

  // Store original positions at sample points.
  gl_FragColor = vec4(vPos * z.z, z.z, z.z);
}