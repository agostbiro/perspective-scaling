// A collection of utility functions used in the demo.
demo.util = {};

/*
  Calls 'callback' with 'responses' array as first argument and the elements of
  'argsArray' as the rest. The 'responses' array containts the responses in
  the same order as the 'urls' array.
  'urls' can be a string, a dict with shape below, an array of strings, or
  an array of dicts.
  {
    url: string,
    responseType: string
  }
*/
demo.util.getAsync = function getAsync(urls, callback, thisArg, argsArray)
{
  var
    nUrls = urls instanceof Array ? urls.length : 0,
    responses = [];


  function count()
  {
    nUrls -= 1;

    if (nUrls < 1)
    {
      try
      {
        argsArray.unshift(responses);
      }
      catch (e)
      {
        argsArray = [responses];      
      }

      callback && callback.apply(thisArg, argsArray);
    }
  }

  function get(url, responseType, i)
  {
    var request = new XMLHttpRequest();

    request.onload = function onload()
    {
      var response = this.response;

      // TODO rethink
      if (this.status !== 200)
      {
        response = undefined;
        console.error(this.response + '\n' + url);
      }

      if (i !== undefined)
        responses[i] = response;        
      else
        responses = response;

      count();
    };

    request.onerror = function onerror()
    {
      console.error(
        'ajax error: url ' + url + ' responded with ' + this.status
      );
    };

    request.open('GET', url);

    // Firefox requires the response type to be set after opening the request.
    request.responseType = responseType || '';

    request.send();
  }


  if (nUrls)
  {
    urls.forEach(function iteratee(url, i)
    {
      get(
        url.url || url, 
        url.responseType, 
        i
      );
    });
  }
  else if (urls)
  {
    get(
      urls.url || urls, 
      urls.responseType
    );
  }
};

// TODO function is redundant
THREE.ImageUtils.crossOrigin = '';
demo.util.initTextureLoader = function initTextureLoader(numberOfTextures,
                                                         callback,
                                                         thisArg,
                                                         argsArray)
{
  function count()
  {
    numberOfTextures -= 1;

    if (numberOfTextures < 1)
      callback.apply(thisArg, argsArray);
  }

  function load(url)
  {
    return THREE.ImageUtils.loadTexture(
      url,
      new THREE.UVMapping(),
      callback ? count : undefined
    );
  }


  return load;
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
demo.util.isFinite = Number.isFinite || function isFinite(value) 
{
  return isFinite(value) && (typeof value === 'number');
};

// The make url functions are overwritten upon initialization with a function
// where the filepath arguments are bound to values supplied as arguments
// to the 'demo.initialzie' function.
demo.util.makeImgUrl = function makeImgUrl(imageFilepath, panoId, tileKey)
{
  return imageFilepath + panoId + '-' + tileKey + '.png';
};

demo.util.makeDepthUrl = function makeDepthUrl(dmFilepath, panoId, tileKey)
{
  return dmFilepath + panoId + '-' + tileKey + '.depth';
};

// Maps a yaw rotation to a cardinal direction.
// 'options' is an array containing values to map, where the first element 
// will be mapped to north and the last to east. If omitted, the radians value
// associated with the cardinal direction is returned.
demo.util.mapToCardinal = (function closure()
{
  var 
    northBound = Math.PI / 4,
    westBound = 3 * Math.PI / 4,
    southBound = 5 * Math.PI / 4,
    eastBound = 7 * Math.PI / 4,

    cardinalInRadians = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];


  return function mapToCardinal(rotY, options)
  {
    var normRotY = demo.util.normalizeRad(rotY);

    options = options || cardinalInRadians;

    if (normRotY < northBound)
      return options[0];
    else if (normRotY < westBound)
      return options[1];
    else if (normRotY < southBound)
      return options[2];
    else if (normRotY < eastBound)
      return options[3];
    else if (demo.util.isFinite(rotY))
      return options[0];
  };
})();

// Positive values reflect counter-clockwise rotation. Make sure the argument
// expresses a c-c rotation and wrap value around 2 * pi.
demo.util.normalizeRad = (function closure()
{
  var doublePi = 2 * Math.PI;

  return function normalizeRad(rad)
  {
    return rad < 0 ? rad % doublePi + doublePi : rad % doublePi;
  };
})();

demo.util.testDependencies = function testDependencies(log)
{
  var gl;


  function logError(message)
  {
    if (!log)
      return;

    console.error(
      'The demo failed to start for the following reason:\n',
      message
    );
  }


  if (!('pointerLockElement' in document || 
        'mozPointerLockElement' in document ||
        'webkitPointerLockElement' in document))
  {
    logError('The Pointer Lock API is unavailable.');
    return false;
  }

  // Chrome and Firefox expose the Pointer Lock API on mobile, even though
  // they don't it support there.
  else if (/Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)) 
  {
    logError('The Pointer Lock API is unavailable.');
    return false;
  }

  gl = document.createElement('canvas').getContext('webgl');
  if (!gl)
  {
    logError('WebGL is unavailable.');
    return false;
  }

  if (!gl.getExtension('OES_texture_float'))
  {
    logError('The OES_texture_float extension to WebGL is unavailable.');
    return false;
  }

  // Consult the link below for elaboration on the idiosyncrasies of WebGL
  // implementations with regards to rendering to floating point framebuffers.
  // https://groups.google.com/d/topic/webgl-dev-list/anBte22iEYM/discussion
  if (!gl.getExtension('WEBGL_color_buffer_float'))
  {
    // Try attaching a floating point texture to a framebuffer.
    try 
    {
      demo.glUtil.createFramebuffer(
        gl, 
        512, 
        {
          type: gl.FLOAT,
          format: gl.RGBA,
          filter: gl.NEAREST,
          wrap: gl.CLAMP_TO_EDGE
        }
      );
    }
    catch (e)
    {
      logError(
        'The functionality described in the WEBGL_color_buffer_float ' +
        'extension specification is unavailable.'
      );
      return false;
    }
  }

  return true;
};

// TODO redundant, use THREE.Math.degToRad
demo.util.toRad = (function closure()
{
  var oneDeginRad = Math.PI / 180;


  return function toRad(degrees)
  {
    return degrees * oneDeginRad;
  };
})();