// Performs steps 2-3. of the perspective scaling procedure.
// https://www.agostbiro.com/ps/paper.html#section-3.8.

precision highp float;

attribute vec4 aPos;

attribute vec2 aTexCoord;

varying vec2
  vSamplePoint,
  vTexCo;

void main(void)
{
  vSamplePoint = aPos.xy;
  vTexCo = aTexCoord;

  gl_Position = aPos;
}
