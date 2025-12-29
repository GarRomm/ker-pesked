import { prisma } from "./prisma"

interface SmsResult {
  success: boolean
  error?: string
}

/**
 * Sends an SMS notification using the SMS Gateway API
 * @param telephone - The phone number to send the SMS to
 * @param message - The message content
 * @param orderId - Optional order ID for logging purposes
 * @returns Promise with the result of the SMS operation
 */
export async function envoyerSmsCommande(
  telephone: string,
  message: string,
  orderId?: string
): Promise<SmsResult> {
  const gatewayUrl = process.env.SMS_GATEWAY_URL
  const apiKey = process.env.SMS_GATEWAY_API_KEY
  const smsEnabled = process.env.SMS_ENABLED === "true"

  // Check if SMS is enabled
  if (!smsEnabled) {
    console.log("SMS disabled. Would have sent:", { telephone, message })
    
    // Log to database even when disabled
    await logSms(telephone, message, orderId, true, "SMS disabled")
    
    return { success: true }
  }

  // Validate configuration
  if (!gatewayUrl || !apiKey) {
    const error = "SMS Gateway not configured. Please set SMS_GATEWAY_URL and SMS_GATEWAY_API_KEY"
    console.error(error)
    await logSms(telephone, message, orderId, false, error)
    return { success: false, error }
  }

  // Validate phone number
  if (!telephone || telephone.trim() === "") {
    const error = "Invalid phone number"
    console.error(error)
    await logSms(telephone, message, orderId, false, error)
    return { success: false, error }
  }

  try {
    // Build the URL with query parameters
    const encodedTelephone = encodeURIComponent(telephone)
    const encodedMessage = encodeURIComponent(message)
    const encodedApiKey = encodeURIComponent(apiKey)
    const url = `${gatewayUrl}?phone=${encodedTelephone}&text=${encodedMessage}&apikey=${encodedApiKey}`

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      // Send the SMS request
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = `SMS Gateway returned status ${response.status}`
        console.error(error)
        await logSms(telephone, message, orderId, false, error)
        return { success: false, error }
      }

      // Log successful SMS
      await logSms(telephone, message, orderId, true)
      console.log("SMS sent successfully:", { telephone, message })
      
      return { success: true }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error sending SMS:", errorMessage)
    await logSms(telephone, message, orderId, false, errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Logs SMS send attempts to the database
 */
async function logSms(
  telephone: string,
  message: string,
  orderId: string | undefined,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.smsLog.create({
      data: {
        telephone,
        message,
        orderId,
        success,
        errorMessage,
      },
    })
  } catch (error) {
    console.error("Error logging SMS to database:", error)
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Generates a standard order ready message
 */
export function genererMessageCommandePrete(
  customerName: string,
  orderItems: { productName: string; quantity: number; unit: string }[]
): string {
  const productsText = orderItems
    .map(item => `${item.productName} (${item.quantity} ${item.unit})`)
    .join(", ")
  
  return `Bonjour ${customerName}, votre commande est prête : ${productsText}. Merci !`
}
