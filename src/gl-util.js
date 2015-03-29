// Boilerplate for common WebGL tasks. 
demo.glUtil = {};

demo.glUtil.createFramebuffer = function createFramebuffer(gl, size, tex)
{
  var framebuffer = Object.create(
    Object,
    {
      'depthBuffer': {
        value: gl.createRenderbuffer()
      },
      'ref': {
        value: gl.createFramebuffer()
      },
      'size': {
        value: gl.createFramebuffer()
      },
      'texture': {
        value: demo.glUtil.createTexture(
                 gl, tex.pixels, tex.type, tex.format, 
                 tex.filter, tex.wrap, tex.flipY, size
               )
      }
    }
  );


  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.ref);

  gl.bindRenderbuffer(gl.RENDERBUFFER, framebuffer.depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    framebuffer.depthBuffer
  );
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    framebuffer.texture,
    0
  );

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
    throw new Error('Framebuffer is incomplete.');

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return framebuffer;
};

/*
  'attributes' is a dictionary of objects of such shape:
  {
    itemSize: Number,
    target: GLenum target,
    type: GLenum type,
    value: typed array,
    usage: GLenum usage
  }
  or for generic attributes:
  {
    target: 'GENERIC_ATTRIBUTE',
    value:
  }

  'uniforms' is a dictionary of objects of such shape:
  {
    setter: name of the WebGL context setter method (string)
    value:
  }
*/
demo.glUtil.createProgram = function createProgram(gl, 
                                                   vertexShaderSource, 
                                                   fragmentShaderSource, 
                                                   attributes,
                                                   uniforms)
{    
  var 
    program = Object.create(
      Object,
      {
        'attributes': {
          value: {}
        },
        'ref': {
          value: gl.createProgram()
        },
        'uniforms': { 
          value: {}
        }
      }
    ),
    fragmentShader = gl.createShader(gl.FRAGMENT_SHADER),
    vertexShader = gl.createShader(gl.VERTEX_SHADER);


  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
  {
    console.log('vertex\n', gl.getShaderInfoLog(vertexShader));
    throw new Error('vertex shader failed to compile');
  }

  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);

  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
  {
    console.log('fragment\n', gl.getShaderInfoLog(fragmentShader));
    throw new Error('fragment shader failed to compile');
  }

  gl.attachShader(program.ref, vertexShader);
  gl.attachShader(program.ref, fragmentShader);


  gl.linkProgram(program.ref);

  _.each(uniforms, function iteratee(value, key)
  {
    var data = {location: gl.getUniformLocation(program.ref, key)};

    _.extend(data, value);

    demo.glUtil.setUniform(gl, program, data);

    program.uniforms[key] = data;
  });

  _.each(attributes, function iteratee(value, key)
  {
    // TODO make index immutable
    var data = {};

    _.extend(data, value);

    if (data.target !== gl.ELEMENT_ARRAY_BUFFER)
      data.index = gl.getAttribLocation(program.ref, key);

    if (data.target === 'GENERIC_ATTRIBUTE')
    {
      // This conforms to the default values of a generic vertex attribute as 
      // specified for 'gl.vertexAttrib?f', (1-3).
      gl.vertexAttrib4f(
        data.index,
        data.value[0],
        data.value[1] ? data.value[1] : 0,
        data.value[2] ? data.value[2] : 0,
        data.value[3] ? data.value[3] : 1
      );
    }
    else
    {
      data.buffer = gl.createBuffer();

      data.numItems = data.value.length / data.itemSize;

      demo.glUtil.setBuffer(gl, program, data);
    }

    program.attributes[key] = data;
  });

  return program;
};

// TODO mipmaps
demo.glUtil.createTexture = function createTexture(gl,
                                                   pixels,
                                                   type,
                                                   format,
                                                   filter,
                                                   wrap,
                                                   flipY,
                                                   size)
{
  var texture = gl.createTexture();


  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

  try
  {
    // 'texImage2D' won't throw an exception on undefined image argument.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format,
      format,
      type,
      pixels ? pixels : 'no pixels'
    );
  }
  catch (e)
  {
    gl.texImage2D(
      gl.TEXTURE_2D, 0, format, size, size, 0, format, type, pixels
    );
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
};

demo.glUtil.disableProgram = function disableProgram(gl, programs)
{
  // Enabled attribute indices are part of the global state. Makes sure
  // that there are no left overs from previous programs.
  while (0 < programs.enabledAttrIndices.length)
    gl.disableVertexAttribArray(programs.enabledAttrIndices.shift());

  gl.useProgram(null);
};

demo.glUtil.enableAttribute = function enableAttribute(gl, programs, key, data)
{
  gl.useProgram(programs.ref);
  gl.bindBuffer(data.target, data.buffer);

  gl.vertexAttribPointer(
    data.index,
    data.itemSize,
    data.type,
    data.normalized ? true : false,
    data.stride ? data.stride : 0,
    data.offset ? data.offset : 0
  );

  gl.enableVertexAttribArray(data.index);
  programs.enabledAttrIndices.push(data.index);

  gl.bindBuffer(data.target, null); 
  gl.useProgram(null);
};

// Uniform locations are special purpose objects bound to a program, while 
// attribute locations are simple integers that index into an array, and that 
// can cause confusion when using multiple programs, therefore attributes 
// need to be enabled right before using a program.
demo.glUtil.enableProgram = function enableProgram(gl, programs, key)
{
  // Enabled attribute indices are part of the global state. Makes sure
  // that there are no left overs from previous programs.
  //while (0 < programs.enabledAttrIndices.length)
    //gl.disableVertexAttribArray(programs.enabledAttrIndices.shift());

  _.each(programs[key].attributes, function iteratee(data)
  {
    // Non-buffer attributes and the element array buffer need not be enabled 
    // and the latter must remain bound for the program.
    if (data.buffer)
      gl.bindBuffer(data.target, data.buffer);

    if (data.target === gl.ARRAY_BUFFER)
      demo.glUtil.enableAttribute(gl, programs, key, data);
  });

  gl.useProgram(programs[key].ref);
};

demo.glUtil.setBuffer = function setBuffer(gl, program, data)
{
  gl.useProgram(program.ref);

  gl.bindBuffer(data.target, data.buffer);

  gl.bufferData(data.target, data.value, data.usage);

  gl.useProgram(null);
};

demo.glUtil.setUniform = function setUniform(gl, program, data)
{
  gl.useProgram(program.ref);

  // Matrix uniform setters have a different signature from the others.
  if (data.setter.indexOf('Matrix') < 0)
    gl[data.setter](data.location, data.value);
  else
    gl[data.setter](data.location, data.transpose, data.value);

  gl.useProgram(null);
};