// Events: render, initialized

// Can not share resources across canvases, therefore the application must share
// a single WebGL context.
demo.initPerspectiveScaling = function initPerspectiveScaling(gl, 
                                                              imgData, 
                                                              psData)
{
  var
    initEvent = {type: 'initialized'},
    renderEvent = {type: 'render'},

    cachePositionsAttributes,
    cachePositionsUniforms,
    framebuffers,
    fbTextureArg,
    flipFB,
    imageTexture,
    perspectiveScaling,
    programs,
    psAttributes,
    psUniforms,
    zTexture;


  function render(target)
  {
    var
      input = flipFB ? 1 : 0,
      output = flipFB ? 0 : 1;


    gl.viewport(0, 0, imgData.size, imgData.size);

    flipFB = !flipFB;

    // The vertex shaders are the same for both programs.
    programs.updateDM.uniforms.uCumDeltaZ.value += imgData.deltaZ;
    demo.glUtil.setUniform(
      gl, programs.updateDM, programs.updateDM.uniforms.uCumDeltaZ
    );
    programs.transformImage.uniforms.uCumDeltaZ.value += imgData.deltaZ;
    demo.glUtil.setUniform(
      gl, programs.transformImage, programs.transformImage.uniforms.uCumDeltaZ
    );


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, imageTexture);

    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, framebuffers[input].texture);

    // The original depth map.
    gl.activeTexture(gl.TEXTURE0 + 2);
    gl.bindTexture(gl.TEXTURE_2D, framebuffers[2].texture);


    demo.glUtil.enableProgram(gl, programs, 'updateDM');

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[output].ref);

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.drawElements(
      gl.TRIANGLES,
      programs.updateDM.attributes.elementBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );

    demo.glUtil.enableProgram(gl, programs, 'transformImage');

    gl.bindFramebuffer(gl.FRAMEBUFFER, target);

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.drawElements(
      gl.TRIANGLES,
      programs.transformImage.attributes.elementBuffer.numItems,
      gl.UNSIGNED_SHORT,
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.activeTexture(gl.TEXTURE0 + 2);
    gl.bindTexture(gl.TEXTURE_2D, null);

    //demo.glUtil.disableProgram(gl, programs);


    perspectiveScaling.dispatchEvent(renderEvent);
  }

  // 'image' is an image object while 'zCoords' is a Float32Array.
  function start(image, zCoords)
  {
    gl.viewport(0, 0, imgData.size, imgData.size);

    flipFB = false;

    // TODO verify that this doesn't leak. WebGL should automatically free 
    // resources once the objects representing them are up for GC.
    // See section 3 of the WebGL spec.
    imageTexture = demo.glUtil.createTexture(
      gl, image, gl.UNSIGNED_BYTE, gl.RGBA, 
      gl.LINEAR, gl.CLAMP_TO_EDGE, true, imgData.size
    );

    programs.updateDM.uniforms.uCumDeltaZ.value = 0;
    demo.glUtil.setUniform(
      gl, programs.updateDM, programs.updateDM.uniforms.uCumDeltaZ
    );
    programs.transformImage.uniforms.uCumDeltaZ.value = 0;
    demo.glUtil.setUniform(
      gl, programs.transformImage, programs.transformImage.uniforms.uCumDeltaZ
    );


    demo.glUtil.enableProgram(gl, programs, 'cachePositions');

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0].ref);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, zTexture);

    // Upload new depth map to the GPU.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, imgData.size,
      imgData.size, 0, gl.LUMINANCE, gl.FLOAT, zCoords
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.drawElements(
      gl.TRIANGLES,
      programs.cachePositions.attributes.elementBuffer.numItems, 
      gl.UNSIGNED_SHORT,
      0
    );

    // Make a copy of the new depth map.
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[2].ref);

    gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
    gl.drawElements(
      gl.TRIANGLES,
      programs.cachePositions.attributes.elementBuffer.numItems, 
      gl.UNSIGNED_SHORT,
      0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    //demo.glUtil.disableProgram(gl, programs);


    perspectiveScaling.dispatchEvent(initEvent);
  }


  // Consult the link below for elaboration on the idiosyncrasies of WebGL
  // implementations with regards to rendering to floating point framebuffers.
  // https://groups.google.com/d/topic/webgl-dev-list/anBte22iEYM/discussion
  gl.getExtension('WEBGL_color_buffer_float');
  gl.getExtension('OES_texture_float');

  // Blending is undesirable for the perspective scaling algorithm.
  gl.disable(gl.BLEND);


  programs = Object.create(
    {},
    {
      'enabledAttrIndices': { 
        value: []
      }
    }
  );

  cachePositionsAttributes = {
    aPos: {
      value: new Float32Array(psData.copyVertices),
      itemSize: 4,
      target: gl.ARRAY_BUFFER,
      type: gl.FLOAT,
      usage: gl.STATIC_DRAW
    },
    aTexCoord: {
      value: new Float32Array(psData.copyTexCoords),
      itemSize: 2,
      target: gl.ARRAY_BUFFER,
      type: gl.FLOAT,
      usage: gl.STATIC_DRAW
    },
    elementBuffer: {
      value: new Uint16Array(psData.copyIndices),
      itemSize: 1,
      target: gl.ELEMENT_ARRAY_BUFFER,
      usage: gl.STATIC_DRAW
    }
  };

  cachePositionsUniforms = {
    uDepthMap: {
      value: 0,
      setter: 'uniform1i'
    },
  };

  psAttributes = {
    aPos: {
      value: new Float32Array(psData.PSvertices),
      itemSize: 4,
      target: gl.ARRAY_BUFFER,
      type: gl.FLOAT,
      usage: gl.STATIC_DRAW
    },
    aQuadrant: {
      value: new Uint8Array(psData.PSmask),
      itemSize: 2,
      target: gl.ARRAY_BUFFER,
      type: gl.UNSIGNED_BYTE,
      usage: gl.STATIC_DRAW
    },
    aTexCoord: {
      value: new Float32Array(psData.PStexCoords),
      itemSize: 2,
      target: gl.ARRAY_BUFFER,
      type: gl.FLOAT,
      usage: gl.STATIC_DRAW
    },

    elementBuffer: {
      value: new Uint16Array(psData.PSindices),
      itemSize: 1,
      target: gl.ELEMENT_ARRAY_BUFFER,
      usage: gl.STATIC_DRAW
    }
  };

  psUniforms = {
    uImage: {
      value: 0,
      setter: 'uniform1i'
    },
    uDepthMap: {
      value: 1,
      setter: 'uniform1i'
    },
      uOriginalDM: {
      value: 2,
      setter: 'uniform1i'
    },

    uCumDeltaZ: {
      value: 0,
      setter: 'uniform1f'
    },
    uDistTexCo: {
      value: 1 / imgData.size,
      setter: 'uniform1f'
    }
  };

  zTexture = demo.glUtil.createTexture(
    gl, undefined, gl.FLOAT, gl.LUMINANCE, 
    gl.NEAREST, gl.CLAMP_TO_EDGE, false, imgData.size
  );

  fbTextureArg = {
    pixels: undefined,
    type: gl.FLOAT,
    format: gl.RGBA,
    filter: gl.NEAREST,
    wrap: gl.CLAMP_TO_EDGE,
    flipY: true
  };

  framebuffers = _.map(
    _.range(3), 
    demo.glUtil.createFramebuffer.bind(
      undefined, gl, imgData.size, fbTextureArg
    )
  );

  programs.cachePositions = demo.glUtil.createProgram(
    gl,
    demo.shaders.cachePositions.vertex,
    demo.shaders.cachePositions.fragment,
    cachePositionsAttributes,
    cachePositionsUniforms
  );

  programs.updateDM = demo.glUtil.createProgram(
    gl,
    demo.shaders.updateDM.vertex,
    demo.shaders.updateDM.fragment,
    psAttributes,
    psUniforms
  );

  programs.transformImage = demo.glUtil.createProgram(
    gl,
    demo.shaders.updateDM.vertex,
    demo.shaders.transformImage.fragment,
    psAttributes,
    psUniforms
  );


  perspectiveScaling = {
    render: render,
    start: start
  };

  // 'apply' is not 'Function.prototype.apply', but a method implemented by
  // THREE.js.
  THREE.EventDispatcher.prototype.apply(perspectiveScaling);

  return perspectiveScaling;
};