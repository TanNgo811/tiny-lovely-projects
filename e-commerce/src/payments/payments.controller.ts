import {
  Controller,
  Post,
  Req,
  Headers,
  Body,
  RawBodyRequest,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger'; // Exclude from Swagger
import { Request } from 'express';

@ApiTags('Payments Webhooks')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Use RawBodyRequest by enabling rawBody in main.ts: app.useBodyParser('json', { verify: (req, res, buf) => { req['rawBody'] = buf; } });
  // Or use a custom decorator / middleware. For simplicity, NestJS 7+ often allows @Req() to get the raw body via specific properties if configured
  // For NestJS using Express, you might need to configure body-parser properly.
  // A common approach is:
  // In main.ts: app.use(express.json({ verify: (req: any, res, buf) => { req.rawBody = buf; } }));
  // Then in controller: @Req() request: Request // request.rawBody

  @Post('stripe-webhooks')
  @ApiExcludeEndpoint() // Usually not for direct client consumption
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException(
        'Raw body not available. Ensure rawBody is enabled in main.ts.',
      );
    }
    return this.paymentsService.handleWebhook(signature, req.rawBody);
  }
}
