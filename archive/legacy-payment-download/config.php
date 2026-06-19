<?php
declare(strict_types=1);

$paypalEnv = strtolower((string) (getenv('PAYPAL_ENV') ?: 'sandbox'));
$defaultPaypalBaseUrl = $paypalEnv === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

define('PAYPAL_ENV', $paypalEnv);
define('PAYPAL_CLIENT_ID', (string) (getenv('PAYPAL_CLIENT_ID') ?: ''));
define('PAYPAL_SECRET', (string) (getenv('PAYPAL_SECRET') ?: ''));
define('PAYPAL_BASE_URL', (string) (getenv('PAYPAL_BASE_URL') ?: $defaultPaypalBaseUrl));
define('DOWNLOAD_SECRET', (string) (getenv('DOWNLOAD_SECRET') ?: ''));
if (DOWNLOAD_SECRET === '' || strlen(DOWNLOAD_SECRET) < 32) {
    error_log('DOWNLOAD_SECRET is missing or too short; set at least 32 characters.');
    http_response_code(500);
    exit('Server configuration error.');
}
define('PRICE', (string) (getenv('PRODUCT_PRICE') ?: '9.99'));
define('CURRENCY', (string) (getenv('PRODUCT_CURRENCY') ?: 'EUR'));
define('PRODUCT_NAME', (string) (getenv('PRODUCT_NAME') ?: 'Fairyland Cottage Book Bundle'));

$detectedScheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$detectedHost = $_SERVER['HTTP_HOST'] ?? 'fairylandcottage.com';
$baseUrl = (string) (getenv('SITE_BASE_URL') ?: ($detectedScheme . '://' . $detectedHost));
$baseUrl = rtrim($baseUrl, '/');

define('SITE_BASE_URL', $baseUrl);

define('SUCCESS_URL', SITE_BASE_URL . '/success.php');
define('CANCEL_URL', SITE_BASE_URL . '/shop.html');

$configuredPrivateDir = getenv('PRIVATE_DOWNLOADS_DIR') ?: '/home/YOUR_SERVER_USER/private_downloads';
$localPrivateDir = __DIR__ . '/private_downloads';
$privateDownloadsDir = is_dir($configuredPrivateDir) ? $configuredPrivateDir : $localPrivateDir;

$bookPrimary = $privateDownloadsDir . '/fairyland-book.pdf';
$audioPrimary = $privateDownloadsDir . '/fairyland-audiobook.wav';

// Local fallback names currently present in this repository.
$bookFallback = $privateDownloadsDir . '/My Journey to Simple, Sustainable Living -  ebook.pdf.pdf';
$audioFallback = $privateDownloadsDir . '/My Journey to Simple, Sustainable Living - Audiobook.wav';

define('PRIVATE_DOWNLOADS_DIR', $privateDownloadsDir);
define('FILE_PATHS', [
    'book' => file_exists($bookPrimary) ? $bookPrimary : $bookFallback,
    'audio' => file_exists($audioPrimary) ? $audioPrimary : $audioFallback,
]);