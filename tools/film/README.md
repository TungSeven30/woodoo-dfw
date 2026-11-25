# Home page film renders

The home page film plays still frames rendered in Blender (Cycles). These scripts build the
room, the kitchen and the hero cabinet, then render every chapter for desktop (1600×900) and
phone (810×1440).

1. Install Blender's Python module (`pip install bpy`) in a virtual environment.
2. Export the finish textures from `public/textures/hi/*.webp` to PNG in the folder that
   `TEX` in `scene.py` points at.
3. Render: `python shots.py -- desktop 12` and `python shots.py -- phone 12`.
   Frames that already exist are skipped, so a stopped run can resume.
4. Encode to WebP: `bash encode.sh` writes `public/film/{desktop,phone}/fNNN.webp`.

`CHAPTERS` in `shots.py` and `CHAPTER_FRAMES` in `src/components/FilmSequenceStage.tsx` must
list the same frame counts.
