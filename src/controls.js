/*
  Adapted from Mr.doob's pointerlock control example and
  John McCutchan's tutorial at html5rocks.com.
  Originals, respectively:
  http://threejs.org/examples/misc_controls_pointerlock.html
  http://www.html5rocks.com/en/tutorials/pointerlock/intro/
  Licences, respectively:
  http://threejs.org/license
  http://www.apache.org/licenses/LICENSE-2.0

  Events: pointerLocked, pointerReleased, moveStart, move, stop, rotation
*/
demo.initControls = function initControl(canvas, deltaZ)
{
  // The controls module does not modify any active cameras directly. Input is
  // applied first to a dummy camera and clients can subscribe to changes in 
  // the rotation and position of this object.
  var
    camera = new THREE.Camera(),

    rotationLocked = false,

    controls,
    moving,
    originalOnChangeCb,
    onMouse;

  function freeRotation()
  {
    rotationLocked = false;
  }

  function get()
  {
    return {
      position: camera.position.clone(),
      rotation: camera.rotation.clone()
    };
  }

  function isPointerLockOn()
  {
    return (document.pointerLockElement === canvas    ||
            document.mozPointerLockElement === canvas ||
            document.webkitPointerLockElement === canvas);
  }

  function lockRotation()
  {
    rotationLocked = true;
  }

  function makeEventArg(type)
  {
    return {
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
      type: type
    };
  }

  function onKeyDown(event)
  {
    // The 'keydown' event fires continuously at roughly 5 events/second.
    if (moving)
      return;

    switch (event.keyCode)
    {
      // up arrow and 'w'
      case 38:
      case 87:
        moving = true;

        controls.dispatchEvent(makeEventArg('moveStart'));

        break;
    }
  }

  function onKeyUp(event)
  {
    switch (event.keyCode)
    {
      case 38:
      case 87:
        moving = false;

        controls.dispatchEvent(makeEventArg('stop'));

        break;
    }
  }

  onMouse = (function closure()
  {
    var 
      halfPi = Math.PI / 2,

      movXkey = 'movementX',
      movYkey = 'movementY';

    if (canvas.mozRequestPointerLock)
    {
      movXkey = 'mozMovementX';
      movYkey = 'mozMovementY';
    }

    if (canvas.webkitRequestPointerLock)
    {
      movXkey = 'webkitMovementX';
      movYkey = 'webkitMovementY';
    }

    return function onMouse(event)
    {
      var 
        movementX,
        movementY,
        pitch,
        yaw;

      if (rotationLocked)
        return;

      movementX = event[movXkey];
      movementY = event[movYkey];

      // TODO magic numbers
      pitch = camera.rotation.x - movementY * 0.002;
      yaw = camera.rotation.y - movementX * 0.002,

      // Constrain pitch to 180 degrees.
      pitch = Math.max(
        -halfPi,
        Math.min(halfPi, pitch)
      );

      // X and Y axes are safe from gimbal lock, because Z is not rotated. 
      // Loosing Z is ok, because no roll rotation is performed.
      camera.rotation.set(pitch, yaw, 0, 'YZX');
    };
  })();

  function plChangeCallback()
  {
    if (isPointerLockOn())
    {
      canvas.addEventListener('mousemove', onMouse);
      document.body.addEventListener('keydown', onKeyDown);
      document.body.addEventListener('keyup', onKeyUp);

      controls.dispatchEvent(makeEventArg('pointerLocked'));
    }
    else
    {
      moving = false;
      rotationLocked = false;
      
      canvas.removeEventListener('mousemove', onMouse);
      document.body.removeEventListener('keydown', onKeyDown);
      document.body.removeEventListener('keyup', onKeyUp);

      controls.dispatchEvent(makeEventArg('pointerReleased'));
    }
  }

  function plErrorCallback()
  {
    throw new Error([
      'Pointer Lock error',
      'pointer lock on: ' + isPointerLockOn(),
      'moving: ' + moving,
      'rotationLocked: ' + rotationLocked
      ].join('\n'));
  }

  function set(position, rotation)
  {
    if (position)
      camera.position.copy(position);

    if (rotation)
      camera.rotation.copy(rotation);
  }

  // This function is called upon rendering each frame. Movement speed is a 
  // function of frame rate.
  function update()
  {
    if (!moving)
      return;

    // Rotation is locked towards the next pano while moving.
    // The camera looks along the (0, 0, -1) vector in its local coordinates.
    camera.translateZ(-deltaZ);

    controls.dispatchEvent(makeEventArg('move'));
  }

  canvas.requestPointerLock = canvas.requestPointerLock    ||
                              canvas.mozRequestPointerLock ||
                              canvas.webkitRequestPointerLock;

  document.exitPointerLock = document.exitPointerLock    ||
                             document.mozExitPointerLock ||
                             document.webkitExitPointerLock;

  document.addEventListener('pointerlockerror', plErrorCallback, false);
  document.addEventListener('mozpointerlockerror', plErrorCallback, false);
  document.addEventListener('webkitpointerlockerror', plErrorCallback, false);

  document.addEventListener('pointerlockchange', plChangeCallback, false);
  document.addEventListener('mozpointerlockchange', plChangeCallback, false);
  document.addEventListener('webkitpointerlockchange', plChangeCallback, false);

  canvas.addEventListener('click', canvas.requestPointerLock.bind(canvas));
  
  // Fire 'rotation' event automatically if the camera's rotation properties 
  // have been changed. Cache the function set up by Three.js and call it first.
  originalOnChangeCb = camera.rotation.onChangeCallback;
  camera.rotation.onChangeCallback = function onChangeCallback()
  {
    originalOnChangeCb.apply(camera.rotation, arguments);
    controls.dispatchEvent(makeEventArg('rotation'));
  };

  controls = {
    freeRotation: freeRotation,
    get: get,
    lockRotation: lockRotation,
    set: set,
    update: update,
    quit: document.exitPointerLock.bind(document)
  };

  // 'apply' is not 'Function.prototype.apply', but a method implemented by
  // Three.js.
  THREE.EventDispatcher.prototype.apply(controls);

  return controls;
};