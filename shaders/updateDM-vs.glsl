// Performs steps 2-3. of the perspective scaling procedure.
// https://www.agostbiro.com/ps/paper.html#section-3.8.

precision highp float;

attribute vec4 aPos;

attribute vec2 
  aQuadrant,
  aTexCoord;

uniform float uDistTexCo;

varying float
  vXDistTexCo,
  vYDistTexCo;

varying vec2
  vSamplePoint,
  vTexCo;

void main(void)
{
  vSamplePoint = aPos.xy;
  vTexCo = aTexCoord;

  // Direction of displacement is different based on the quadrant pixels
  // are located in.
  if (aQuadrant.x == 1.0)
    vXDistTexCo = -uDistTexCo;
  else
    vXDistTexCo = uDistTexCo;          

  if (aQuadrant.y == 1.0)
    vYDistTexCo = -uDistTexCo;          
  else
    vYDistTexCo = uDistTexCo;          

  gl_Position = aPos;
}
