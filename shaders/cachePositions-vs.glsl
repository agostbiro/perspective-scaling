attribute vec2 aTexCoord;

attribute vec4 aPos;

varying vec2 
  vPos,
  vTexCo;

void main(void)
{
  vTexCo = aTexCoord;
  vPos = aPos.xy;

  gl_Position = aPos;
}