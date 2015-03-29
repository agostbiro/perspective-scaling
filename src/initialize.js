/*
  'data' is a dictionary of objects of such shape (values and link keys are 
  examples):

  {
    "image": {
      "bufferSize": 3,
      "deltaZ": 0.001,
      "dmFilepath": "/assets/data/depth-maps/",
      "imageFilepath": "/assets/images/panoramas/",
      "size": 512
    },
    "pano": [
      {
        "id": 0,
        "links": {
          "east": {
            "distance": 0.55,
            "id": 37
          },
          "north": {
            "distance": 0.5,
            "id": 1
          }
        },
        "position": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
    ],
    "PSattributes": {
      "copyVertices": [],
      "copyTexCoords": [],
      "copyIndices": [],
      "PSvertices": [],
      "PStexCoords": [],
      "PSmask": [],
      "PSindices": []
    }
  }

  Events: render, buffering, quit, webglcontextlost, webglcontextrestored
*/

demo.initialize = function initialize(canvas, data)
{
  var
    app,
    canvasSize,
    camera,
    controls,
    cubicPanorama,
    panoHandler,
    panoramas,
    perspectiveScaling,
    renderer,
    renderEvent,
    requestId,
    scene;


  function animate()
  {
    renderer.clear();
    renderer.render(scene, camera);

    controls.update();

    app.dispatchEvent(renderEvent);

    requestId = requestAnimationFrame(animate);
  }

  function resize(size)
  {
    canvasSize = size;
    renderer.setViewport(0, 0, canvasSize, canvasSize);

    renderer.clear();
    renderer.render(scene, camera);
  }

  function prepareToMove()
  {
    var imageData = panoHandler.getCurrent().getCurrentImage(
          controls.get().rotation.y
        );

    if (imageData)
    {
      perspectiveScaling.start(imageData.image, imageData.depthMap);

      return imageData;
    }
    else
    {
      return false;
    }
  }

  function resetRendererState()
  {
    renderer.setViewport(0, 0, canvasSize, canvasSize);
    renderer.resetGLState();
  }

  function quitAnimation()
  {
    if (requestId)
    {
      window.cancelAnimationFrame(requestId);
      requestId = undefined;
  
      app.dispatchEvent({type: 'quit'});
    }
  }


  if (!demo.util.testDependencies())
    return false;


  app = {
    resize: resize
  };

  // 'apply' is not 'Function.prototype.apply', but a method implemented by
  // Three.js.
  THREE.EventDispatcher.prototype.apply(app);


  canvasSize = Math.min(canvas.width, canvas.height);
  camera = new THREE.PerspectiveCamera(90, 1, 0.25, 1);
  scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xbbbbbb));

  renderer = new THREE.WebGLRenderer({canvas: canvas});
  canvas.addEventListener('webglcontextlost', function callback(e)
  {
    controls && controls.quit();
    quitAnimation();

    app.dispatchEvent({
      type: 'webglcontextlost',
      originalEvent: e
    });
  });
  canvas.addEventListener('webglcontextrestored', function callback(e)
  {
    app.dispatchEvent({
      type: 'webglcontextrestored',
      originalEvent: e
    });
  });

  // Image synthetisation is independent of the display viewport size. It is
  // important that the 'devicePixelRatio' is set to 1 to handle resizes
  // properly on retina displays.
  renderer.devicePixelRatio = 1;
  renderer.setClearColor(new THREE.Color(1, 1, 1));
  renderEvent = {type: 'render'};


  demo.util.makeDepthUrl = demo.util.makeDepthUrl.bind(
    demo.util, data.image.dmFilepath
  );
  demo.util.makeImgUrl = demo.util.makeImgUrl.bind(
    demo.util, data.image.imageFilepath
  );
  
  panoramas = _.map(data.pano, function iteratee(pano)
  {
    return new demo.Panorama(pano);
  });

  // Set up circular linked list of panorama objects.
  _.each(panoramas, function iteratee(pano, i, panoramas)
  {
    _.each(pano.links, function iteratee (link, key)
    {
      link.key = key;
      link.node = panoramas[link.id];
    });
  });

  controls = demo.initControls(canvas, data.image.deltaZ);
  cubicPanorama = new demo.CubicPanorama(renderer, data.image.size);
  panoHandler = demo.initPanoHandler(panoramas[0], data.image);
  perspectiveScaling = demo.initPerspectiveScaling(
    renderer.context, data.image, data.PSattributes
  );

  scene.add(cubicPanorama);

  perspectiveScaling.addEventListener('render', resetRendererState);
  perspectiveScaling.addEventListener('initialized', resetRendererState);
  cubicPanorama.addEventListener('render', resetRendererState);

  panoHandler.addEventListener('panoChange', function callback(e)
  {
    cubicPanorama.setTiles(e.pano.tiles);
    
    prepareToMove();
  });
  panoHandler.addEventListener('bufferingStart', function callback(e)
  {
    controls.quit();

    app.dispatchEvent({
      percentage: 0,
      start: true,
      type: 'buffering'
    });
  });
  panoHandler.addEventListener('panoLoaded', function callback(e)
  {
    var currentPano;

    if (e.percentage === 100)
    {
      currentPano = panoHandler.getCurrent();
      cubicPanorama.setTiles(currentPano.tiles);
    
      renderer.render(scene, camera);

      controls.set(currentPano.position);
    }

    app.dispatchEvent({
      percentage: e.percentage,
      start: false,
      type: 'buffering'
    });
  });

  controls.set(panoHandler.getCurrent().position);
  controls.addEventListener('move', function callback(e)
  {
    var direction = panoHandler.update(e.position, e.rotation);

    if (direction)
    {
      perspectiveScaling.render(
        cubicPanorama.renderTargets[direction].__webglFramebuffer,
        data.image.deltaZ
      );
    }
  });
  controls.addEventListener('moveStart', (function closure()
  {
    var cachedRotation = new THREE.Euler();

    return function callback()
    {
      var imageData = prepareToMove();

      if (imageData)
      {
        cachedRotation.fromArray(imageData.rotation);
        controls.set(undefined, cachedRotation);
        controls.lockRotation();
      }
    };
  })());
  controls.addEventListener('rotation', function callback(e)
  {
    camera.rotation.copy(e.rotation);
  });
  controls.addEventListener('stop', function callback(e)
  {
    controls.set(panoHandler.snapToNext(e.rotation));
    controls.freeRotation();
  });
  controls.addEventListener('pointerLocked', function  callback(e)
  {
    if (!requestId)
      animate();
  });
  controls.addEventListener('pointerReleased', quitAnimation);


  return app;
};