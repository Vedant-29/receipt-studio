import type { TemplateId } from './types';

export const TEMPLATE_INFO: Record<TemplateId, { name: string; description: string; width: number }> = {
	default: { name: 'Classic', description: 'Itemised till receipt', width: 43 },
	'self-service': { name: 'Kiosk', description: 'Self-service order slip', width: 43 },
	barcode: { name: 'Barcode', description: 'Code, coupon or loyalty slip', width: 43 },
	ticket: { name: 'Ticket', description: 'Ticket with a tear-off stub', width: 72 }
};
