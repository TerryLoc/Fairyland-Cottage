<?php
$index = file_get_contents('index.html');
preg_match('/<body>(.*?)<!-- main content -->/s', $index, $matches);
$correct_headers = $matches[1];

$files = glob('*.html');
foreach ($files as $f) {
    if ($f === 'index.html') continue;
    $content = file_get_contents($f);
    $updated = preg_replace('/<body>.*?<!-- main content -->/s', "<body>" . $correct_headers . "<!-- main content -->", $content, 1);
    file_put_contents($f, $updated);
}
echo "Replaced headers\n";
