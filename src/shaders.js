/* jshint ignore:start */
demo.shaders = {
  "cachePositions": {
    "fragment": "precision highp float;uniform sampler2D uDepthMap;varying vec2 vPos,vTexCo;vec4 z;void main(void){\nz=clamp(vec4(texture2D(uDepthMap,vTexCo).z),0.0,16.0);gl_FragColor=vec4(vPos*z.z,z.z,0.0);}",
    "vertex": "attribute vec2 aTexCoord;attribute vec4 aPos;varying vec2 vPos,vTexCo;void main(void){vTexCo=aTexCoord;vPos=aPos.xy;gl_Position=aPos;}"
  },
  "copy": {
    "fragment": "precision mediump float;uniform sampler2D uTexture;varying vec2 vTexCo;void main(void){gl_FragColor=texture2D(uTexture,vTexCo);}",
    "vertex": "attribute vec4 aPos;attribute vec2 aTexCoord;varying vec2 vTexCo;void main(void){vTexCo=aTexCoord;gl_Position=aPos;}"
  },
  "transformImage": {
    "fragment": "precision highp float;uniform float uCumDeltaZ;uniform sampler2D uImage,uDepthMap,uOriginalDM;varying float vXDistTexCo,vYDistTexCo;varying vec2 vSamplePoint,vTexCo;float alpha,beta,gamma,f,z;vec2 pTexCo,texCo;vec3\np,q,r;void getBarycentricCoords(in vec2 a,in vec2 b,in vec2 c,in vec2 p,out float u,out float v,out float w){float\nd00,d01,d11,d20,d21,denom;vec2 v0,v1,v2;v0=b-a;v1=c-a;v2=p-a;d00=dot(v0,v0);d01=dot(v0,v1);d11=dot(v1,v1);d20=dot(v2,v0);d21=dot(v2,v1);denom=d00*d11-d01*d01;v=(d11*d20-d01*d21)/denom;w=(d00*d21-d01*d20)/denom;u=1.0-v-w;}vec2 toTexCo(in vec2 normalized_coord){return(normalized_coord+1.0)/2.0;}void main(void){p=texture2D(uDepthMap,vTexCo).xyz;pTexCo=toTexCo(p.xy/p.z);p=vec3(p.xy/(p.z-uCumDeltaZ),p.z-uCumDeltaZ);q=texture2D(uOriginalDM,vec2(pTexCo.x+vXDistTexCo,pTexCo.y)).xyz;q=vec3(q.xy/(q.z-uCumDeltaZ),q.z-uCumDeltaZ);r=texture2D(uOriginalDM,vec2(pTexCo.x,pTexCo.y+vYDistTexCo)).xyz;r=vec3(r.xy/(r.z-uCumDeltaZ),r.z-uCumDeltaZ);getBarycentricCoords(p.xy,q.xy,r.xy,vSamplePoint,alpha,beta,gamma);z=(alpha+beta+gamma)/(alpha/p.z+beta/q.z+gamma/r.z);f=(z+uCumDeltaZ)/z;texCo=toTexCo(vSamplePoint/f);gl_FragColor=texture2D(uImage,texCo);}"
  },
  "updateDM": {
    "fragment": "precision highp float;uniform float uCumDeltaZ;uniform sampler2D uDepthMap;varying float vXDistTexCo,vYDistTexCo;varying vec2 vSamplePoint,vTexCo;vec2 samplePoint;vec4 selfPos,XYnbrPos,XnbrPos,YnbrPos;void main(void){selfPos=texture2D(uDepthMap,vTexCo);XYnbrPos=texture2D(uDepthMap,vTexCo+vec2(vXDistTexCo,vYDistTexCo));XnbrPos=texture2D(uDepthMap,vec2(vTexCo.x+vXDistTexCo,vTexCo.y));YnbrPos=texture2D(uDepthMap,vec2(vTexCo.x,vTexCo.y+vYDistTexCo));samplePoint=abs(vSamplePoint);if(all(greaterThanEqual(abs(XYnbrPos.xy)/(XYnbrPos.z-uCumDeltaZ),samplePoint)))gl_FragColor=XYnbrPos;else if(samplePoint.x<=abs(XnbrPos.x)/(XnbrPos.z-uCumDeltaZ))gl_FragColor=XnbrPos;else if(samplePoint.y<=abs(YnbrPos.y)/(YnbrPos.z-uCumDeltaZ))gl_FragColor=YnbrPos;else\ngl_FragColor=selfPos;}",
    "vertex": "precision highp float;attribute vec4 aPos;attribute vec2 aQuadrant,aTexCoord;uniform float uDistTexCo;varying float\nvXDistTexCo,vYDistTexCo;varying vec2\nvSamplePoint,vTexCo;void main(void){vSamplePoint=aPos.xy;vTexCo=aTexCoord;if(aQuadrant.x==1.0)vXDistTexCo=-uDistTexCo;else\nvXDistTexCo=uDistTexCo;if(aQuadrant.y==1.0)vYDistTexCo=-uDistTexCo;else\nvYDistTexCo=uDistTexCo;gl_Position=aPos;}"
  }
};
/* jshint ignore:end */