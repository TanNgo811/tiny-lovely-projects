import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service'; // To update order status
import { OrderStatus } from '../orders/enums/order-status.enum';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService, // Inject OrdersService
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new InternalServerErrorException(
        'Stripe secret key is not configured.',
      );
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-04-10', // Use a fixed API version
    });
  }

  async createPaymentIntent(
    amountCents: number,
    currency: string,
    paymentMethodId: string,
    orderId: string,
    // customerId?: string, // Optional Stripe customer ID
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirmation_method: 'manual', // We will confirm it
        confirm: true, // Attempt to confirm immediately
        metadata: { order_id: orderId },
        return_url: `${this.configService.get('FRONTEND_URL')}/order-confirmation/${orderId}`, // For SCA
        // automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, // if you want Stripe to pick
      });
    } catch (error) {
      console.error('Stripe Payment Intent creation error:', error.message);
      // Handle specific Stripe errors if needed
      throw new BadRequestException(
        `Payment processing failed: ${error.message}`,
      );
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'Stripe webhook secret is not configured.',
      );
    }
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error(`⚠️  Webhook signature verification failed.`, err.message);
      throw new BadRequestException(`Webhook error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntentSucceeded = event.data.object;
        console.log('✅ PaymentIntent succeeded:', paymentIntentSucceeded.id);
        const orderId = paymentIntentSucceeded.metadata.order_id;
        if (orderId) {
          // Ideally, update order status through OrdersService
          // await this.ordersService.updateOrderStatus(orderId, { status: OrderStatus.PROCESSING }); // Or PAID
          // Store paymentIntentSucceeded.id if not already stored.
          console.log(
            `Order ${orderId} payment successful. Update status and notify user.`,
          );
          await this.ordersService.updateOrderAfterPayment(
            orderId,
            paymentIntentSucceeded.id,
            OrderStatus.PROCESSING,
          );
        } else {
          console.error(
            'Webhook payment_intent.succeeded missing order_id in metadata:',
            paymentIntentSucceeded.id,
          );
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntentFailed = event.data.object;
        console.log('❌ PaymentIntent failed:', paymentIntentFailed.id);
        const failedOrderId = paymentIntentFailed.metadata.order_id;
        if (failedOrderId) {
          // await this.ordersService.updateOrderStatus(failedOrderId, { status: OrderStatus.FAILED });
          console.log(`Order ${failedOrderId} payment failed. Update status.`);
          await this.ordersService.updateOrderAfterPayment(
            failedOrderId,
            paymentIntentFailed.id,
            OrderStatus.FAILED,
          );
        } else {
          console.error(
            'Webhook payment_intent.payment_failed missing order_id in metadata:',
            paymentIntentFailed.id,
          );
        }
        break;
      }
      // ... handle other event types (e.g., 'charge.refunded')
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return { received: true };
  }
}
