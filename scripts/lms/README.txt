AI T&L Essentials: Level 1 (AI-Aware)
Static package for Brightspace (or any plain file host)
=======================================================

WHAT THIS IS
  A complete, self-contained copy of the learning package as ordinary HTML
  files. No server, no build step and no internet connection is required. The
  quizzes, checklists, explorers, contents panel and progress bar all work.

UPLOADING TO BRIGHTSPACE
  1. Upload the CONTENTS of this folder (not the folder itself) to your course
     file area, keeping the structure intact:

        index.html
        part-1.html … part-6.html
        assets/            <- stylesheet, script, logo, fonts

  2. Point your topic or link at  index.html

  Keep index.html and the assets folder side by side. The pages reference each
  other with relative links, so moving a file out of the folder breaks it.

THE PAGES
  index.html    Start here — welcome and package overview
  part-1.html   NP's Approach to AI-Enabled Teaching & Learning
  part-2.html   Curriculum Design and Development
  part-3.html   Facilitation of Learning — PAIR
  part-4.html   Assessment
  part-5.html   Data and Tech-Enhanced T&L
  part-6.html   Bring It Together

NOTES
  - Learner answers and progress are stored in the browser (localStorage), the
    same as the web version. They are per-browser and are not reported back to
    Brightspace; the completion quiz is administered separately.
  - Two links point outside the package and need internet access: the sector AI
    baseline (Part 2) and the GenAI in Summative Assessment policy (Part 4).
  - To regenerate after a content change, run  npm run build:lms  in the
    project and re-zip the lms-build folder.
