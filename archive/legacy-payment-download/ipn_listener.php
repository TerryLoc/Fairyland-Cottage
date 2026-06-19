<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/payment_utils.php';

if (file_exists(__DIR__ . '/lib/db.php')) {
    require_once __DIR__ . '/lib/db.php';
}

function ipn_log(string $message, array $context = []): void
{
    $logDirectory = __DIR__ . '/logs';
    fc_ensure_directory($logDirectory);

    $line = '[' . gmdate('c') . '] ' . $message;
    if ($context !== []) {
        $line .= ' | ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    file_put_contents($logDirectory . '/ipn_listener.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function ipn_amount_to_cents(string $amount): ?int
{
    $normalized = trim($amount);
    if (!preg_match('/^\d+(?:\.\d{1,2})?$/', $normalized)) {
        return null;
    }

    $parts = explode('.', $normalized, 2);
    $whole = (int) $parts[0];
    $fraction = str_pad($parts[1] ?? '0', 2, '0');
    $fraction = (int) substr($fraction, 0, 2);

    return ($whole * 100) + $fraction;
}

function ipn_mark_txn_as_processed(string $txnId): bool
{
    if (function_exists('init_db') && function_exists('mark_ipn_txn_processed')) {
        init_db();
        return (bool) mark_ipn_txn_processed($txnId);
    }

    $lockDirectory = __DIR__ . '/logs/processed_ipn_txns';
    fc_ensure_directory($lockDirectory);

    $lockPath = $lockDirectory . '/' . hash('sha256', $txnId) . '.lock';
    $handle = @fopen($lockPath, 'x');
    if ($handle === false) {
        return false;
    }

    fwrite($handle, $txnId . PHP_EOL);
    fclose($handle);

    return true;
}

function ipn_send_download_email(string $buyerEmail, string $orderReference, string $bookUrl, string $audioUrl): void
{
    $from = 'info@fairylandcottage.com';
    $subject = 'Your Fairyland Cottage Purchase';
    $message = "Thank you for your purchase.\n\n";
    $message .= "Order reference: {$orderReference}\n\n";
    $message .= "Download your files (links expire in 1 hour):\n";
    $message .= "- Ebook (PDF): {$bookUrl}\n";
    $message .= "- Audiobook (WAV): {$audioUrl}\n\n";
    $message .= "If you need fresh links, contact info@fairylandcottage.com\n";

    fc_ensure_directory(__DIR__ . '/logs');
    $logMessage = "Download email dispatched. Secure URLs redacted.\n";
    file_put_contents(
        __DIR__ . '/logs/sent_emails.log',
        '[' . gmdate('c') . '] To: ' . $buyerEmail . "\nSubject: {$subject}\nFrom: {$from}\nOrder: {$orderReference}\n\n{$logMessage}----\n",
        FILE_APPEND | LOCK_EX
    );

    if (file_exists(__DIR__ . '/vendor/autoload.php')) {
        require_once __DIR__ . '/vendor/autoload.php';

        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $smtpHost = getenv('SMTP_HOST') ?: '';
            $smtpUser = getenv('SMTP_USER') ?: '';
            $smtpPass = getenv('SMTP_PASS') ?: '';
            $smtpPort = (int) (getenv('SMTP_PORT') ?: '587');
            $smtpSecure = (string) (getenv('SMTP_SECURE') ?: 'tls');

            if ($smtpHost !== '' && $smtpUser !== '' && $smtpPass !== '') {
                $mail->isSMTP();
                $mail->Host = $smtpHost;
                $mail->SMTPAuth = true;
                $mail->Username = $smtpUser;
                $mail->Password = $smtpPass;
                $mail->SMTPSecure = $smtpSecure;
                $mail->Port = $smtpPort;
            }

            $mail->setFrom($from, 'Fairyland Cottage');
            $mail->addAddress($buyerEmail);
            $mail->addBCC($from);
            $mail->Subject = $subject;
            $mail->Body = $message;
            $mail->send();

            ipn_log('Email sent via PHPMailer', ['buyer_email' => $buyerEmail, 'order_id' => $orderReference]);
            return;
        } catch (Throwable $exception) {
            ipn_log('PHPMailer failed', [
                'buyer_email' => $buyerEmail,
                'order_id' => $orderReference,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    if (function_exists('mail')) {
        $headers = "From: {$from}\r\n";
        $headers .= "Reply-To: {$from}\r\n";
        $headers .= "Bcc: {$from}\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        $sent = @mail($buyerEmail, $subject, $message, $headers);
        ipn_log('Email attempted via mail()', [
            'buyer_email' => $buyerEmail,
            'order_id' => $orderReference,
            'sent' => $sent,
        ]);
    }
}

if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo 'Method Not Allowed';
    exit;
}

$rawPostData = file_get_contents('php://input');
if ($rawPostData === false || $rawPostData === '') {
    ipn_log('IPN rejected: empty request body');
    http_response_code(400);
    echo 'Bad Request';
    exit;
}

$postData = [];
parse_str($rawPostData, $postData);
if (!is_array($postData) || $postData === []) {
    ipn_log('IPN rejected: unable to parse body', ['raw_bytes' => strlen($rawPostData)]);
    http_response_code(400);
    echo 'Bad Request';
    exit;
}

$isBypassTestRequest = ((string) ($postData['test'] ?? '')) === '1';
if (PAYPAL_ENV === 'live' && $isBypassTestRequest) {
    ipn_log('IPN rejected: live mode test bypass attempt', [
        'txn_id' => (string) ($postData['txn_id'] ?? ''),
    ]);
    http_response_code(500);
    exit;
}

$verifyEndpoint = PAYPAL_ENV === 'live'
    ? 'https://ipnpb.paypal.com/cgi-bin/webscr'
    : 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr';

$verifyPayload = 'cmd=_notify-validate&' . $rawPostData;
$curl = curl_init($verifyEndpoint);
if ($curl === false) {
    ipn_log('IPN rejected: could not initialize cURL');
    http_response_code(500);
    echo 'Server Error';
    exit;
}

curl_setopt_array($curl, [
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS => $verifyPayload,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => ['Connection: Close'],
]);

$verifyResponse = curl_exec($curl);
$verifyError = curl_error($curl);
$verifyCode = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);

if ($verifyResponse === false || $verifyError !== '') {
    ipn_log('IPN verification request failed', ['error' => $verifyError, 'http_code' => $verifyCode]);
    http_response_code(500);
    echo 'Server Error';
    exit;
}

$verificationStatus = trim($verifyResponse);
if ($verificationStatus !== 'VERIFIED') {
    ipn_log('IPN verification failed', [
        'http_code' => $verifyCode,
        'verification_status' => $verificationStatus,
        'txn_id' => (string) ($postData['txn_id'] ?? ''),
    ]);
    http_response_code(400);
    echo 'Invalid IPN';
    exit;
}

$paymentStatus = strtoupper((string) ($postData['payment_status'] ?? ''));
if ($paymentStatus !== 'COMPLETED') {
    ipn_log('IPN ignored: payment status not completed', [
        'payment_status' => $paymentStatus,
        'txn_id' => (string) ($postData['txn_id'] ?? ''),
    ]);
    http_response_code(200);
    echo 'OK';
    exit;
}

$expectedReceiver = strtolower(trim((string) (getenv('PAYPAL_RECEIVER_EMAIL') ?: '')));
$actualReceiver = strtolower(trim((string) ($postData['receiver_email'] ?? $postData['business'] ?? '')));
if ($expectedReceiver !== '' && $actualReceiver !== $expectedReceiver) {
    ipn_log('IPN rejected: receiver mismatch', [
        'expected_receiver' => $expectedReceiver,
        'actual_receiver' => $actualReceiver,
        'txn_id' => (string) ($postData['txn_id'] ?? ''),
    ]);
    http_response_code(400);
    echo 'Invalid receiver';
    exit;
}

$expectedCurrency = strtoupper(CURRENCY);
$actualCurrency = strtoupper(trim((string) ($postData['mc_currency'] ?? '')));
if ($actualCurrency !== '' && $actualCurrency !== $expectedCurrency) {
    ipn_log('IPN rejected: currency mismatch', [
        'expected_currency' => $expectedCurrency,
        'actual_currency' => $actualCurrency,
        'txn_id' => (string) ($postData['txn_id'] ?? ''),
    ]);
    http_response_code(400);
    echo 'Invalid currency';
    exit;
}

$expectedAmountCents = ipn_amount_to_cents(PRICE);
$actualAmountRaw = (string) ($postData['mc_gross'] ?? $postData['payment_gross'] ?? '');
$actualAmountCents = ipn_amount_to_cents($actualAmountRaw);
if ($expectedAmountCents !== null && $actualAmountCents !== null && $expectedAmountCents !== $actualAmountCents) {
    ipn_log('IPN rejected: amount mismatch', [
        'expected_amount' => PRICE,
        'actual_amount' => $actualAmountRaw,
        'txn_id' => (string) ($postData['txn_id'] ?? ''),
    ]);
    http_response_code(400);
    echo 'Invalid amount';
    exit;
}

$buyerEmail = filter_var((string) ($postData['payer_email'] ?? ''), FILTER_VALIDATE_EMAIL);
$txnId = trim((string) ($postData['txn_id'] ?? ''));
if ($txnId === '') {
    ipn_log('IPN rejected: missing txn_id');
    http_response_code(400);
    echo 'Invalid IPN';
    exit;
}

$orderReference = $txnId;

try {
    $isFirstProcessing = ipn_mark_txn_as_processed($txnId);
} catch (Throwable $exception) {
    ipn_log('IPN dedupe check failed', [
        'txn_id' => $txnId,
        'error' => $exception->getMessage(),
    ]);

    http_response_code(500);
    echo 'Server Error';
    exit;
}

if (!$isFirstProcessing) {
    ipn_log('Duplicate IPN transaction ignored', ['txn_id' => $txnId]);
    http_response_code(200);
    exit;
}

try {
    $downloadExpiry = time() + 3600;
    $bookToken = fc_generate_download_token('book', $downloadExpiry, $orderReference);
    $audioToken = fc_generate_download_token('audio', $downloadExpiry, $orderReference);

    $bookUrl = SITE_BASE_URL . '/download.php?file=book&expires=' . $downloadExpiry . '&token=' . rawurlencode($bookToken);
    $audioUrl = SITE_BASE_URL . '/download.php?file=audio&expires=' . $downloadExpiry . '&token=' . rawurlencode($audioToken);

    if (is_string($buyerEmail) && $buyerEmail !== '') {
        ipn_send_download_email($buyerEmail, $orderReference, $bookUrl, $audioUrl);
    } else {
        ipn_log('IPN completed but no valid payer email available', ['order_id' => $orderReference]);
    }

    ipn_log('IPN completed and processed', [
        'order_id' => $orderReference,
        'buyer_email' => $buyerEmail ?: '',
    ]);
} catch (Throwable $exception) {
    ipn_log('IPN processing failed', [
        'order_id' => $orderReference,
        'error' => $exception->getMessage(),
    ]);

    http_response_code(500);
    echo 'Server Error';
    exit;
}

http_response_code(200);
echo 'OK';