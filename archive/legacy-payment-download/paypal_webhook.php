<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/payment_utils.php';

function webhook_log(string $message, array $context = []): void
{
    $logDirectory = __DIR__ . '/logs';
    fc_ensure_directory($logDirectory);

    $line = '[' . gmdate('c') . '] ' . $message;
    if ($context !== []) {
        $line .= ' | ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    file_put_contents($logDirectory . '/paypal_webhooks.log', $line . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function webhook_get_header(array $headers, string $serverKey, string $headerName): string
{
    $serverValue = trim((string) ($_SERVER[$serverKey] ?? ''));
    if ($serverValue !== '') {
        return $serverValue;
    }

    foreach ($headers as $name => $value) {
        if (strcasecmp((string) $name, $headerName) === 0) {
            return trim((string) $value);
        }
    }

    return '';
}

function webhook_extract_payer_email(array $resource): string
{
    $payer = $resource['payer'] ?? null;
    if (!is_array($payer)) {
        return '';
    }

    $emailAddress = trim((string) ($payer['email_address'] ?? ''));
    if ($emailAddress !== '') {
        return $emailAddress;
    }

    $payerInfo = $payer['payer_info'] ?? null;
    if (is_array($payerInfo)) {
        $legacyEmail = trim((string) ($payerInfo['email'] ?? ''));
        if ($legacyEmail !== '') {
            return $legacyEmail;
        }
    }

    return '';
}

function webhook_extract_amount_value(array $resource): string
{
    $candidate = trim((string) ($resource['amount']['value'] ?? ''));
    if ($candidate !== '') {
        return $candidate;
    }

    $candidate = trim((string) ($resource['purchase_units'][0]['amount']['value'] ?? ''));
    if ($candidate !== '') {
        return $candidate;
    }

    return trim((string) ($resource['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? ''));
}

function webhook_extract_amount_currency(array $resource): string
{
    $candidate = strtoupper(trim((string) ($resource['amount']['currency_code'] ?? '')));
    if ($candidate !== '') {
        return $candidate;
    }

    $candidate = strtoupper(trim((string) ($resource['purchase_units'][0]['amount']['currency_code'] ?? '')));
    if ($candidate !== '') {
        return $candidate;
    }

    return strtoupper(trim((string) ($resource['purchase_units'][0]['payments']['captures'][0]['amount']['currency_code'] ?? '')));
}

function webhook_mark_event_processed(string $eventId): void
{
    $storePath = __DIR__ . '/logs/processed_webhook_events.log';
    fc_ensure_directory(dirname($storePath));
    file_put_contents($storePath, $eventId . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function webhook_is_event_processed(string $eventId): bool
{
    $storePath = __DIR__ . '/logs/processed_webhook_events.log';
    if (!is_file($storePath)) {
        return false;
    }

    $handle = fopen($storePath, 'rb');
    if ($handle === false) {
        return false;
    }

    while (($line = fgets($handle)) !== false) {
        if (trim($line) === $eventId) {
            fclose($handle);
            return true;
        }
    }

    fclose($handle);
    return false;
}

function webhook_send_download_email(string $buyerEmail, string $orderReference, string $bookUrl, string $audioUrl): void
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

            webhook_log('Email sent via PHPMailer', ['buyer_email' => $buyerEmail, 'order_id' => $orderReference]);
            return;
        } catch (Throwable $exception) {
            webhook_log('PHPMailer failed', [
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
        webhook_log('Email attempted via mail()', [
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

$skipVerify = getenv('PAYPAL_SKIP_VERIFY') === '1';
if (PAYPAL_ENV === 'live' && $skipVerify) {
    webhook_log('Webhook rejected: PAYPAL_SKIP_VERIFY cannot be enabled in live mode');
    http_response_code(500);
    exit;
}

$body = file_get_contents('php://input');
if ($body === false || $body === '') {
    webhook_log('Webhook rejected: empty body');
    http_response_code(400);
    echo 'Bad Request';
    exit;
}

$payload = json_decode($body, true);
if (!is_array($payload)) {
    webhook_log('Webhook rejected: invalid JSON body');
    http_response_code(400);
    echo 'Bad Request';
    exit;
}

$rawEventType = (string) ($payload['event_type'] ?? '');
$eventType = strtoupper($rawEventType);
$eventId = trim((string) ($payload['id'] ?? ''));
$resource = $payload['resource'] ?? null;

$requiresCompletedSchema = in_array($eventType, ['CHECKOUT.ORDER.COMPLETED', 'PAYMENT.CAPTURE.COMPLETED'], true);
if ($requiresCompletedSchema) {
    $resourceIsArray = is_array($resource);
    $statusRaw = $resourceIsArray ? trim((string) ($resource['status'] ?? '')) : '';
    $payerEmailCandidate = $resourceIsArray ? webhook_extract_payer_email($resource) : '';

    if ($eventId === '' || $statusRaw === '' || $payerEmailCandidate === '') {
        webhook_log('Malformed completed-payment webhook ignored', [
            'event_type_raw' => $rawEventType,
            'event_id_present' => $eventId !== '',
            'resource_present' => $resourceIsArray,
            'status_present' => $statusRaw !== '',
            'payer_email_present' => $payerEmailCandidate !== '',
        ]);

        if ($eventId !== '') {
            webhook_mark_event_processed($eventId);
        }

        http_response_code(200);
        echo 'OK';
        exit;
    }
}

$headers = function_exists('getallheaders') ? getallheaders() : [];
$transmissionId = webhook_get_header($headers, 'HTTP_PAYPAL_TRANSMISSION_ID', 'Paypal-Transmission-Id');
$transmissionTime = webhook_get_header($headers, 'HTTP_PAYPAL_TRANSMISSION_TIME', 'Paypal-Transmission-Time');
$certUrl = webhook_get_header($headers, 'HTTP_PAYPAL_CERT_URL', 'Paypal-Cert-Url');
$authAlgo = webhook_get_header($headers, 'HTTP_PAYPAL_AUTH_ALGO', 'Paypal-Auth-Algo');
$transmissionSig = webhook_get_header($headers, 'HTTP_PAYPAL_TRANSMISSION_SIG', 'Paypal-Transmission-Sig');
$webhookId = trim((string) (getenv('PAYPAL_WEBHOOK_ID') ?: ''));

if ($transmissionId === '' || $transmissionTime === '' || $certUrl === '' || $authAlgo === '' || $transmissionSig === '' || $webhookId === '') {
    webhook_log('Webhook rejected: missing verification headers or webhook id', [
        'transmission_id_present' => $transmissionId !== '',
        'transmission_time_present' => $transmissionTime !== '',
        'cert_url_present' => $certUrl !== '',
        'auth_algo_present' => $authAlgo !== '',
        'transmission_sig_present' => $transmissionSig !== '',
        'webhook_id_present' => $webhookId !== '',
    ]);
    http_response_code(400);
    echo 'Invalid webhook request';
    exit;
}

try {
    $accessToken = fc_get_paypal_access_token();
    $verifyResponse = fc_request_paypal(
        'POST',
        PAYPAL_BASE_URL . '/v1/notifications/verify-webhook-signature',
        $accessToken,
        json_encode([
            'auth_algo' => $authAlgo,
            'cert_url' => $certUrl,
            'transmission_id' => $transmissionId,
            'transmission_sig' => $transmissionSig,
            'transmission_time' => $transmissionTime,
            'webhook_id' => $webhookId,
            'webhook_event' => $payload,
        ], JSON_UNESCAPED_SLASHES)
    );

    $verifyPayload = is_array($verifyResponse['data']) ? $verifyResponse['data'] : [];
    $verificationStatus = strtoupper((string) ($verifyPayload['verification_status'] ?? ''));
    if ($verificationStatus !== 'SUCCESS') {
        webhook_log('Webhook signature verification failed', [
            'verification_status' => $verificationStatus,
            'verify_response' => $verifyResponse['raw'],
        ]);
        http_response_code(400);
        echo 'Invalid signature';
        exit;
    }
} catch (Throwable $exception) {
    webhook_log('Webhook verification failed', ['error' => $exception->getMessage()]);
    http_response_code(500);
    echo 'Server Error';
    exit;
}

if ($eventId !== '' && webhook_is_event_processed($eventId)) {
    webhook_log('Webhook duplicate ignored', ['event_id' => $eventId]);
    http_response_code(200);
    echo 'OK';
    exit;
}

$resource = is_array($resource) ? $resource : [];
$resourceStatus = strtoupper((string) ($resource['status'] ?? ''));

$isCompletedEvent =
    ($eventType === 'PAYMENT.CAPTURE.COMPLETED' && $resourceStatus === 'COMPLETED')
    || ($eventType === 'CHECKOUT.ORDER.COMPLETED' && $resourceStatus === 'COMPLETED');

if (!$isCompletedEvent) {
    webhook_log('Webhook event ignored: not a completed payment event', [
        'event_id' => $eventId,
        'event_type' => $eventType,
        'resource_status' => $resourceStatus,
    ]);

    if ($eventId !== '') {
        webhook_mark_event_processed($eventId);
    }

    http_response_code(200);
    echo 'OK';
    exit;
}

$expectedAmount = number_format((float) PRICE, 2, '.', '');
$actualAmountRaw = webhook_extract_amount_value($resource);
$actualAmount = $actualAmountRaw !== '' ? number_format((float) $actualAmountRaw, 2, '.', '') : '';
if ($actualAmount === '' || $actualAmount !== $expectedAmount) {
    webhook_log('Webhook rejected: amount mismatch', [
        'event_id' => $eventId,
        'event_type' => $eventType,
        'expected_amount' => $expectedAmount,
        'actual_amount' => $actualAmountRaw,
    ]);
    http_response_code(400);
    echo 'Invalid amount';
    exit;
}

$expectedCurrency = strtoupper(CURRENCY);
$actualCurrency = webhook_extract_amount_currency($resource);
if ($actualCurrency === '' || $actualCurrency !== $expectedCurrency) {
    webhook_log('Webhook rejected: currency mismatch', [
        'event_id' => $eventId,
        'event_type' => $eventType,
        'expected_currency' => $expectedCurrency,
        'actual_currency' => $actualCurrency,
    ]);
    http_response_code(400);
    echo 'Invalid currency';
    exit;
}

$buyerEmail = filter_var(webhook_extract_payer_email($resource), FILTER_VALIDATE_EMAIL);

$orderReference = trim((string) (
    $resource['supplementary_data']['related_ids']['order_id']
    ?? $resource['id']
    ?? $eventId
));

if ($orderReference === '') {
    $orderReference = 'WEBHOOK-' . strtoupper(substr(hash('sha256', $body), 0, 16));
}

try {
    $downloadExpiry = time() + 3600;
    $bookToken = fc_generate_download_token('book', $downloadExpiry, $orderReference);
    $audioToken = fc_generate_download_token('audio', $downloadExpiry, $orderReference);

    $bookUrl = SITE_BASE_URL . '/download.php?file=book&expires=' . $downloadExpiry . '&token=' . rawurlencode($bookToken);
    $audioUrl = SITE_BASE_URL . '/download.php?file=audio&expires=' . $downloadExpiry . '&token=' . rawurlencode($audioToken);

    if (is_string($buyerEmail) && $buyerEmail !== '') {
        webhook_send_download_email($buyerEmail, $orderReference, $bookUrl, $audioUrl);
    } else {
        webhook_log('Webhook completed but no valid payer email available', [
            'event_id' => $eventId,
            'order_id' => $orderReference,
        ]);
    }

    webhook_log('Webhook completed and processed', [
        'event_id' => $eventId,
        'event_type' => $eventType,
        'order_id' => $orderReference,
        'buyer_email' => $buyerEmail ?: '',
    ]);
} catch (Throwable $exception) {
    webhook_log('Webhook processing failed', [
        'event_id' => $eventId,
        'order_id' => $orderReference,
        'error' => $exception->getMessage(),
    ]);

    http_response_code(500);
    echo 'Server Error';
    exit;
}

if ($eventId !== '') {
    webhook_mark_event_processed($eventId);
}

http_response_code(200);
echo 'OK';
