export enum OrderStatus {
  PENDING = 'pending', // Order placed, awaiting payment confirmation or processing
  PROCESSING = 'processing', // Payment confirmed, order is being prepared
  SHIPPED = 'shipped', // Order has been shipped
  DELIVERED = 'delivered', // Order has been delivered
  CANCELLED = 'cancelled', // Order was cancelled by user or admin
  FAILED = 'failed', // Payment failed or other issue prevented order completion
}