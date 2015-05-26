precision highp float;

uniform float uCumDeltaZ;

uniform sampler2D 
  uImage,
  uDepthMap;

varying vec2 
  vSamplePoint,
  vTexCo;

float
  f,
  z;

vec2 
  pTexCo,
  texCo;

vec2 toTexCo(in vec2 normalized_coord)
{
  return (normalized_coord + 1.0) / 2.0;
}

void main(void)
{
  z = texture2D(uDepthMap, vTexCo).w;

  // Map the sample point back to the original image using the refined depth
  // values.
  f = (z + uCumDeltaZ) / z;
  texCo = toTexCo(vSamplePoint / f);

  // Reconstruct the original image with a bilinear filter and sample it
  // to construct the image at COP'.
  gl_FragColor = texture2D(uImage, texCo);
}