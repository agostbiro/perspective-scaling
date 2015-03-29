demo.Panorama = function Panorama(a)
{
  this.buffering = false;
  this.depths = {};
  this.id = a.id;
  this.loaded = false;
  this.onload = undefined;
  this.position = new THREE.Vector3(a.position.x, a.position.y, a.position.z);
  this.tiles = {};

  /*
    a.links is a dictionary of objects of such shape:
    "east": {
      "distance": 0.6,
      "id": 58,
      "key": 'east',
    }
  */
  this.links = {};
  _.each(
    a.links,
    function iteratee(link, key)
    {
      this.links[key] = _.clone(link);
      this.links[key].key = undefined;
      this.links[key].node = undefined;
    },
    this
  );
};

demo.Panorama.prototype.tileKeys = [
  'north',
  'west',
  'south',
  'east',
  'bottom',
  'top'
];

demo.Panorama.prototype.getCurrentImage = function getCurrentImage(rotY) 
{
  var nextKey = this.getNextKey(rotY);


  if (!nextKey)
    return undefined;

  return {
    depthMap: this.depths[nextKey],
    image: this.tiles[nextKey].image,
    rotation: [
      0, 
      demo.util.mapToCardinal(rotY), 
      0
    ]
  };
};

demo.Panorama.prototype.getNext = function getNext(rotY)
{
  return this.links[this.getNextKey(rotY)];
};

demo.Panorama.prototype.getNextKey = function getNext(rotY)
{
  // The 'mapToCardinal' function uses only the first 4 elements of its 
  // second argument.
  return demo.util.mapToCardinal(rotY, this.tileKeys);
};

// TODO onerror
demo.Panorama.prototype.load = function load(callback, thisArg, args)
{
  var 
    depthKeys,
    depthUrls,
    loadTexture,
    n;


  function count()
  {
    n += 1;

    if (n === 2)
    {
      this.buffering = false;
      this.loaded = true;

      this.onload && this.onload();
      this.onload = undefined;
    }
  }


  if (this.buffering)
    return this;

  if (callback)
  {
    this.onload = callback.bind.apply(
      callback,
      [thisArg || this].concat(args)
    );
  }

  if (this.loaded)
  {
    this.onload && this.onload();
    this.onload = undefined;

    return this;
  }

  this.buffering = true;

  n = 0;

  depthKeys = [];
  depthUrls = _.map(
    this.links,
    function iteratee(link, key)
    {
      // Preserve order to map responses appropriately.
      depthKeys.push(key);

      return {
        responseType: 'arraybuffer',
        url: demo.util.makeDepthUrl(this.id, key)
      };
    },
    this
  );

  demo.util.getAsync(
    depthUrls,
    function callback(responses)
    {
      _.each(
        responses,
        function iteratee(rawZ, i)
        {
          this.depths[depthKeys[i]] = new Float32Array(rawZ);
        },
        this
      );

      count.apply(this);
    },
    this
  );

  loadTexture = demo.util.initTextureLoader(
    this.tileKeys.length, 
    count.bind(this)
  );

  _.each(
    this.tileKeys,
    function iteratee(tileKey)
    {
      this.tiles[tileKey] = loadTexture(
        demo.util.makeImgUrl(this.id, tileKey)
      );
    },
    this
  );

  return this;
};

// TODO verify that it doesn't leak
demo.Panorama.prototype.unload = function unload()
{
  _.each(this.tiles, function iteratee(texture, key, tiles)
  {
    texture.dispose();
    tiles[key] = undefined;
  });

  _.each(this.depths, function iteratee(depth, key, depths)
  {
    depths[key] = undefined;
  });

  this.loaded = false;
  this.onload = undefined;

  return this;
};