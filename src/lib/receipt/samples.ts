import type { Receipt, TemplateId } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(now: Date) {
	return {
		date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
		time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
		compact: `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
	};
}

/** Example receipts for each template. A fictional café, so nothing here looks like a real business. */
export function sampleReceipt(template: TemplateId = 'default', now = new Date()): Receipt {
	const { date, time, compact } = stamp(now);
	const store = {
		name: 'FERN & FIG CAFÉ',
		address: '42 Market Street\nSpringfield',
		phone: '(555) 014-2290',
		website: 'fernandfig.example'
	};
	const items = [
		{ name: 'Flat White', quantity: 2, price: 4.2 },
		{ name: 'Almond Croissant', quantity: 1, price: 3.8 },
		{ name: 'Avocado Toast', quantity: 1, price: 9.5, discount: 1.5 }
	];

	switch (template) {
		case 'self-service':
			return {
				template,
				style: {},
				content: {
					store,
					orderNumber: 'A42',
					date,
					time,
					surveyCode: '2417-8830-5521',
					currency: 'usd',
					items,
					tax: { rate: 8 },
					paymentMethod: 'Card',
					paymentDetails: { cardType: 'Visa', lastFour: '4242' },
					thankYou: 'We will call your number shortly',
					footer: ['Tell us how we did: fernandfig.example/r']
				}
			};
		case 'barcode':
			return {
				template,
				style: {},
				content: {
					store: { name: store.name },
					info: ['LOYALTY REWARD', 'Show this at the till for', '10% off your next coffee'],
					barcode: { barcode: `FF-${compact}-10`, qrCode: 'https://fernandfig.example/rewards' },
					footer: ['Valid for 30 days', 'One per visit']
				}
			};
		case 'ticket':
			return {
				template,
				style: {},
				content: {
					store: { name: 'ROOFTOP JAZZ NIGHT' },
					info: [`${date} · Doors 7:30 PM`, 'Fern & Fig Café, Level 3', 'General admission'],
					barcode: { barcode: `RJN-${compact}-0117` },
					footer: ['Admit one · Non-transferable', 'Ticket #0117']
				}
			};
		default:
			return {
				template: 'default',
				style: {},
				content: {
					store,
					orderNumber: '0042',
					date,
					time,
					cashier: 'Maya',
					currency: 'usd',
					items,
					tax: { rate: 8 },
					tip: 2,
					paymentMethod: 'Card',
					paymentDetails: { cardType: 'Visa', lastFour: '4242' },
					barcode: { barcode: `0042-${compact}` },
					thankYou: 'Thank you, see you soon!',
					footer: ['Free wifi: fernandfig', 'Tell us how we did: fernandfig.example/r']
				}
			};
	}
}
