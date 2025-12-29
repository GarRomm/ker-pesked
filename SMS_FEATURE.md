# SMS Notification Feature

This document describes the SMS notification feature that automatically sends SMS messages to customers when their orders are ready for pickup.

## Overview

The SMS notification feature integrates with the Android app "SMS Gateway API" to send SMS notifications to customers. When an order status is changed to "READY", the system automatically sends an SMS to the customer's phone number (if available) with details about their order.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# SMS Gateway API Configuration
SMS_GATEWAY_URL="http://192.168.1.25:8080/send"
SMS_GATEWAY_API_KEY="YOUR_API_KEY"
SMS_ENABLED="false"
```

- **SMS_GATEWAY_URL**: The URL of your SMS Gateway API endpoint (default format: `http://IP:PORT/send`)
- **SMS_GATEWAY_API_KEY**: The API key configured in your SMS Gateway API app
- **SMS_ENABLED**: Set to `"true"` to enable SMS sending, `"false"` to disable (useful for development/testing)

### Hardware Setup

1. **Android Device**: Use an older Android phone with SMS capability
2. **SIM Card**: Install a SIM card with an unlimited SMS package
3. **Network**: Connect the Android device and server to the same local Wi-Fi network
4. **SMS Gateway API App**:
   - Install from Google Play Store
   - Configure with a strong API password
   - Enable the service and note the local URL (e.g., `http://192.168.1.25:8080`)

### Security Recommendations

- Use a strong password for the SMS Gateway API
- Restrict API access to local IP addresses only
- Keep the Android device plugged into a power source for reliability
- Store the API key securely and never commit it to version control

## Features

### 1. Automatic SMS on Status Change

When an order status is updated to "READY", the system:
- Checks if the customer has a phone number
- Generates a message with order details
- Sends an SMS notification automatically
- Logs the SMS attempt to the database

### 2. Manual Customer Notification

Employees can manually send SMS notifications for orders in "READY" status:
- Click the "Notifier" button on any READY order
- System sends SMS with order details
- Confirmation or error message is displayed

### 3. SMS Logging

All SMS attempts are logged to the `SmsLog` table with:
- Phone number
- Message content
- Order ID (if applicable)
- Timestamp
- Success/failure status
- Error message (if failed)

## Order Status Flow

The order status workflow now includes:

1. **PENDING** (En cours) - Initial status when order is created
2. **READY** (Prête) - Order is prepared and ready for pickup
   - Automatically triggers SMS notification
3. **DELIVERED** (Livrée) - Order has been picked up by customer
4. **CANCELLED** (Annulée) - Order was cancelled

## API Endpoints

### Update Order Status

```
PUT /api/orders/:id
```

Updates order status. When status changes to "READY", triggers SMS notification.

**Request Body:**
```json
{
  "status": "READY",
  "notes": "Optional notes"
}
```

### Manual Notification

```
POST /api/orders/:id/notify
```

Manually sends SMS notification for an order.

**Response:**
```json
{
  "message": "SMS notification sent successfully",
  "phone": "0612345678"
}
```

## Message Format

The SMS message format is:

```
Bonjour [Customer Name], votre commande est prête : [Product 1] (quantity unit), [Product 2] (quantity unit). Merci !
```

Example:
```
Bonjour M. Dupont, votre commande est prête : Saumon (2 kg), Crevettes (0.5 kg). Merci !
```

## Testing

### Test SMS Sending

1. Set `SMS_ENABLED="false"` in your `.env` file for testing without actually sending SMS
2. Check the console logs to see what would be sent
3. Verify SMS logs are created in the database

### Manual Test with Browser

When `SMS_ENABLED="true"`, you can test the gateway directly:

```
http://192.168.1.25:8080/send?phone=0612345678&text=Test+commande+pret&apikey=YOUR_API_KEY
```

Replace the IP, phone number, and API key with your actual values.

## Database Schema

### SmsLog Table

```sql
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telephone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "orderId" TEXT,
    "dateEnvoi" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT
);

CREATE INDEX "SmsLog_orderId_idx" ON "SmsLog"("orderId");
CREATE INDEX "SmsLog_dateEnvoi_idx" ON "SmsLog"("dateEnvoi");
```

## Troubleshooting

### SMS Not Sending

1. Check that `SMS_ENABLED="true"` in `.env`
2. Verify `SMS_GATEWAY_URL` and `SMS_GATEWAY_API_KEY` are set correctly
3. Ensure the Android device is connected to the network
4. Check that the SMS Gateway API app is running on the device
5. Verify the customer has a valid phone number in the system

### SMS Logs

Check the `SmsLog` table for all SMS attempts:
- `success = true`: SMS was sent successfully
- `success = false`: SMS failed (check `errorMessage` for details)

### Console Logs

The application logs SMS activities to the console:
- SMS sending attempts
- Success/failure messages
- Configuration warnings

## Development

When developing locally:
1. Set `SMS_ENABLED="false"` to avoid sending actual SMS
2. The system will still log SMS attempts to the database
3. Console logs show what would have been sent

## Production Deployment

Before deploying to production:
1. Ensure SMS Gateway hardware is set up and connected
2. Set `SMS_ENABLED="true"` in production environment
3. Configure correct `SMS_GATEWAY_URL` with the actual device IP
4. Use a strong `SMS_GATEWAY_API_KEY`
5. Test with a few real orders before going live
