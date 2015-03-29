// Keeps track of which panorama to show based on the location of view point and
// handles buffering.
// Events: bufferingStart, panoLoaded, panoChange
demo.initPanoHandler = function initPanoHandler(firstPano, imgData)
{
  var
    buffer,
    currentPano,
    panoHandler;


  function bindPanoChange(pano)
  {
    return panoHandler.dispatchEvent.bind(
      panoHandler,
      {
        pano: pano,
        type: 'panoChange'
      }
    );
  }

  // Make sure 'imgData.bufferSize' panoramas are loaded on each path from the 
  // panorama and unload the ones not required anymore.
  // Works on an arbitrary grid.
  // Operates under the assumption that all loaded panoramas are linked to one
  // another at any given time.
  buffer = (function closure()
  {
    var 
      bufferHash,
      currentLoaded,
      totalToLoad,
      nLoaded;

    function load(pano, n, callback, thisArg, args)
    {
      if (n < 0)
      {
        unload(pano);

        return;
      }

      if (!pano.loaded && !currentLoaded)
      {
        totalToLoad += 1;

        // Overwrite the onload method, in case the panorama is already 
        // buffering.  
        pano.onload = measureProgress.bind(pano, callback, thisArg, args);
        pano.load();
      }
      else
      {
        // The 'load' method fires the callback even if the panorama is loaded.
        pano.load(callback, thisArg, args);
      }

      bufferHash[pano.id] = true;

      _.each(pano.links, function iteratee(link)
      {
        if (!bufferHash[link.id])
          load(link.node, n - 1);
      });
    }

    function measureProgress(callback, thisArg, args)
    {
      var percentage;

      nLoaded += 1;
      percentage = Math.round(nLoaded / totalToLoad * 100);

      panoHandler.dispatchEvent({
        pano: this,
        percentage: percentage,
        type: 'panoLoaded'
      });

      if (callback)
      {
        callback.apply(
          thisArg || this,
          args instanceof Array ? args : [args]
        );
      }
    }

    function unload(pano)
    {
      if (!pano.loaded || bufferHash[pano.id])
        return;

      pano.unload();

      _.each(pano.links, function iteratee(link)
      {
        unload(link.node);
      });
    }

    return function buffer(currentPano, callback, thisArg, args)
    {
      currentLoaded = currentPano.loaded;
      bufferHash = {};
      totalToLoad = 0;
      nLoaded = 0;

      if (!currentLoaded)
      {
        panoHandler.dispatchEvent({
          pano: currentPano,
          type: 'bufferingStart'
        });
      }

      load(currentPano, imgData.bufferSize, callback, thisArg, args);        
    };
  })();

  function getCurrent()
  {
    return currentPano;
  }

  function snapToNext(camRotation)
  {
    var nextLink = currentPano.getNext(camRotation.y);

    if (!nextLink)
      return undefined;

    currentPano = nextLink.node;
    buffer(
      currentPano,
      bindPanoChange(currentPano)
    );

    return currentPano.position.clone();
  }

  // Determines whether the displayed panorama should be changed based on the
  // camera's position and rotation. If so, initiates the appropriate updates.
  function update(camPosition, camRotation)
  {
    // Get the link to the neighbouring panorama in the direction of heading.
    var
      nextLink = currentPano.getNext(camRotation.y),

      distance;

    // If there is no connection in the direction that we're heading in, there
    // is nothing to do.
    if (!nextLink)
      return undefined;

    distance = currentPano.position.distanceTo(camPosition);

    // See if the camera has reached the next panorama. If it has, we need to
    // use it as the current panorama for texture rendering. To that end, make
    // sure its neighbours are buffered, then set it as current.
    if (nextLink.distance <= distance)
    {
      currentPano = nextLink.node;
      buffer(
        currentPano,
        bindPanoChange(currentPano)
      );

      if (!(nextLink.key in currentPano.links))
        return undefined;
    }

    return nextLink.key;
  }


  panoHandler = {
    getCurrent: getCurrent,
    snapToNext: snapToNext,
    update: update
  };

  // 'apply' is not 'Function.prototype.apply', but a method implemented by
  // Three.js.
  THREE.EventDispatcher.prototype.apply(panoHandler);


  // Initilaize first panorama.
  currentPano = firstPano;
  buffer(
    currentPano, 
    bindPanoChange(currentPano)
  );


  return panoHandler;
};