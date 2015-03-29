import json
from os import listdir
import re

inpath = 'shaders/'
outpath = 'src/shaders.js'

fnames = [fname for fname in listdir(path=inpath) if '.glsl' in fname]
raw_shaders = {}

with open('shaders/export/prepend.js', 'r') as f:
  prepend = f.read()

with open('shaders/export/append.js', 'r') as f:
  append = f.read()

for fname in fnames:
  with open(inpath + fname, 'r') as f:
    raw_shaders[fname.replace('.glsl', '')] = re.sub('.*//.*|\s+(?=[^a-zA-Z0-9\s])|(?<=\W)\s+', 
                                                     '', 
                                                     f.read())

shaders = {key[:key.find('-')]: {} for key in raw_shaders.keys()}

for key, container in shaders.items():
  try:
    container['vertex'] = raw_shaders[key + '-vs']
  except KeyError:
    pass

  try:
    container['fragment'] = raw_shaders[key + '-fs']
  except KeyError:
    pass

with open(outpath, 'w') as f:
  f.write(prepend)
  json.dump(shaders, f, indent=2, sort_keys=True)
  f.write(append)

print('Finished exporting the following shaders to', outpath, ':\n', 
  ', '.join(shaders.keys()))