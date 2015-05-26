precision highp float;

uniform float uCumDeltaZ;

uniform sampler2D 
  uDepthMap,
  uOriginalDM;

varying float
  vXDistTexCo,
  vYDistTexCo;

varying vec2
  vSamplePoint,
  vTexCo;

float 
  alpha,
  beta,
  gamma;

vec2
  pTexCo,
  samplePoint;

vec3
  p, q, r;

vec4
  selfPos,
  XYnbrPos,
  XnbrPos,
  YnbrPos;

// From: Ericson, Christer. Real-time Collision Detection. 
//       Amsterdam: Elsevier, 2005. p. 47.
void getBarycentricCoords(in vec2 a, in vec2 b, in vec2 c, in vec2 p, 
                          out float u, out float v, out float w)
{
  float
    d00, d01, d11, d20, d21,
    denom;

  vec2 
    v0, v1, v2;

  v0 = b - a;
  v1 = c - a;
  v2 = p - a;

  d00 = dot(v0, v0);
  d01 = dot(v0, v1);
  d11 = dot(v1, v1);
  d20 = dot(v2, v0);
  d21 = dot(v2, v1);

  denom = d00 * d11 - d01 * d01;

  v = (d11 * d20 - d01 * d21) / denom;
  w = (d00 * d21 - d01 * d20) / denom;
  u = 1.0 - v - w;
}

vec2 toTexCo(in vec2 normalized_coord)
{
  return (normalized_coord + 1.0) / 2.0;
}

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

  // Build the displaced depth map from the depth map yielded by the previous
  // iteration by selecting the appropriate value (if any) from the three 
  // neighboring candidates.
  if (all(greaterThanEqual(abs(XYnbrPos.xy) / (XYnbrPos.z - uCumDeltaZ), 
                           samplePoint)))
    gl_FragColor = XYnbrPos;
  else if (samplePoint.x <= abs(XnbrPos.x) / (XnbrPos.z - uCumDeltaZ))
    gl_FragColor = XnbrPos;
  else if (samplePoint.y <= abs(YnbrPos.y) / (YnbrPos.z - uCumDeltaZ))
    gl_FragColor = YnbrPos;
  else
    gl_FragColor = selfPos;

  // Refine the coarse depth map yielded by the previous step with 
  // perspective-correct barycentric interpolation.
  p = gl_FragColor.xyz;
  pTexCo = toTexCo(p.xy / p.z);
  p = vec3(p.xy / (p.z - uCumDeltaZ), p.z - uCumDeltaZ);

  q = texture2D(uOriginalDM, vec2(pTexCo.x + vXDistTexCo, pTexCo.y)).xyz;
  q = vec3(q.xy / (q.z - uCumDeltaZ), q.z - uCumDeltaZ);

  r = texture2D(uOriginalDM, vec2(pTexCo.x, pTexCo.y + vYDistTexCo)).xyz;
  r = vec3(r.xy / (r.z - uCumDeltaZ), r.z - uCumDeltaZ);
  
  getBarycentricCoords(p.xy, q.xy, r.xy, vSamplePoint, alpha, beta, gamma);

  // See p. 58. of the OpenGL Es 2.0.25 spec for the formula.
  gl_FragColor.w = (alpha + beta + gamma) / 
                   (alpha / p.z + beta / q.z + gamma / r.z);
}