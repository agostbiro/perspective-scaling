precision highp float;

uniform float uCumDeltaZ;

uniform sampler2D uDepthMap;

varying float 
  vXDistTexCo,
  vYDistTexCo;

varying vec2 
  vSamplePoint,
  vTexCo;

vec2 
  samplePoint;

vec4 
  selfPos,
  XYnbrPos,
  XnbrPos,
  YnbrPos;

void main(void)
{
  // Since all code is executed regardless whether it's in a branch or 
  // not, it makes sense to initiate texture lookups as early as possible.
  selfPos = texture2D(uDepthMap, vTexCo);
  XYnbrPos = texture2D(uDepthMap, vTexCo + vec2(vXDistTexCo, vYDistTexCo));
  XnbrPos = texture2D(uDepthMap, vec2(vTexCo.x + vXDistTexCo, vTexCo.y));
  YnbrPos = texture2D(uDepthMap, vec2(vTexCo.x, vTexCo.y + vYDistTexCo));

  // Allow comparison without special casing.
  samplePoint = abs(vSamplePoint);

  // Find the depth map value at dz from the depth map at dz - x.
  // The depth map at dz - x is 'uDepthMap'.
  if (all(greaterThanEqual(abs(XYnbrPos.xy) / (XYnbrPos.z - uCumDeltaZ), 
                           samplePoint)))
    gl_FragColor = XYnbrPos;
  else if (samplePoint.x <= abs(XnbrPos.x) / (XnbrPos.z - uCumDeltaZ))
    gl_FragColor = XnbrPos;
  else if (samplePoint.y <= abs(YnbrPos.y) / (YnbrPos.z - uCumDeltaZ))
    gl_FragColor = YnbrPos;
  else
    gl_FragColor = selfPos;
}