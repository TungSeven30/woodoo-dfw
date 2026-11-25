#!/bin/bash
# encode rendered PNG frames to WebP for the site
set -e
R=/home/user/woodoo-dfw/public
for set in desktop phone; do
  mkdir -p $R/film/$set
  for f in /tmp/claude-0/film/$set/f*.png; do
    b=$(basename $f .png)
    out=$R/film/$set/$b.webp
    [ -f $out ] && [ $out -nt $f ] && continue
    python3 -c "
from PIL import Image
im=Image.open('$f').convert('RGB')
im.save('$out','WEBP',quality=$([ $set = desktop ] && echo 80 || echo 78),method=6)
"
  done
done
