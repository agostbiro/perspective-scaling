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