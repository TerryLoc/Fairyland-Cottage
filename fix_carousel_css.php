<?php
$css = file_get_contents('assets/css/videos.css');

$css = str_replace(
'  #vid1:checked ~ .video-1 {
    margin-left: 0;
    z-index: 1;
  }

  #vid2:checked ~ .video-2 {
    margin-left: 200%;
  }

  #vid3:checked ~ .video-3 {
    margin-left: -200%;
  }

  #vid4:checked ~ .video-1 {
    margin-left: 0;
    z-index: 1;
  }

  #vid5:checked ~ .video-2 {
    margin-left: 200%;
  }

  #vid6:checked ~ .video-3 {
    margin-left: -200%;
  }

  #vid7:checked ~ .video-1 {
    margin-left: 0;
    z-index: 1;
  }

  #vid8:checked ~ .video-2 {
    margin-left: 200%;
  }

  #vid9:checked ~ .video-3 {
    margin-left: -200%;
  }',
'  #vid1:checked ~ .video-1, #vid4:checked ~ .video-1, #vid7:checked ~ .video-1 { margin-left: 0; z-index: 1; opacity: 1; }
  #vid1:checked ~ .video-2, #vid4:checked ~ .video-2, #vid7:checked ~ .video-2 { margin-left: 200%; opacity: 0; }
  #vid1:checked ~ .video-3, #vid4:checked ~ .video-3, #vid7:checked ~ .video-3 { margin-left: 400%; opacity: 0; }

  #vid2:checked ~ .video-1, #vid5:checked ~ .video-1, #vid8:checked ~ .video-1 { margin-left: -200%; opacity: 0; }
  #vid2:checked ~ .video-2, #vid5:checked ~ .video-2, #vid8:checked ~ .video-2 { margin-left: 0; z-index: 1; opacity: 1; }
  #vid2:checked ~ .video-3, #vid5:checked ~ .video-3, #vid8:checked ~ .video-3 { margin-left: 200%; opacity: 0; }

  #vid3:checked ~ .video-1, #vid6:checked ~ .video-1, #vid9:checked ~ .video-1 { margin-left: -400%; opacity: 0; }
  #vid3:checked ~ .video-2, #vid6:checked ~ .video-2, #vid9:checked ~ .video-2 { margin-left: -200%; opacity: 0; }
  #vid3:checked ~ .video-3, #vid6:checked ~ .video-3, #vid9:checked ~ .video-3 { margin-left: 0; z-index: 1; opacity: 1; }',
$css);

file_put_contents('assets/css/videos.css', $css);
echo "Done\n";
