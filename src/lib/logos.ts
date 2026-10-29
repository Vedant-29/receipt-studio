import {
	Apple,
	BedDouble,
	Beer,
	Bike,
	BookOpen,
	BottleWine,
	Brush,
	Bus,
	CakeSlice,
	Camera,
	Candy,
	Car,
	CarTaxiFront,
	Carrot,
	ChefHat,
	Citrus,
	Coffee,
	Cookie,
	Croissant,
	CupSoda,
	Cupcake,
	Donut,
	Drumstick,
	Dumbbell,
	Film,
	Fish,
	Flower2,
	Fuel,
	Gem,
	Gift,
	Glasses,
	Guitar,
	Ham,
	Hamburger,
	Hammer,
	HandPlatter,
	Headphones,
	Hotel,
	IceCreamCone,
	Laptop,
	Leaf,
	Martini,
	Milk,
	Music,
	Package,
	Palette,
	PaintRoller,
	PawPrint,
	Pencil,
	Pill,
	Pizza,
	Plane,
	Popcorn,
	Popsicle,
	Salad,
	Sandwich,
	Scissors,
	Shirt,
	ShoppingBag,
	ShoppingBasket,
	ShoppingCart,
	Smartphone,
	Soup,
	Sparkles,
	SprayCan,
	Sprout,
	Stethoscope,
	Store,
	Tent,
	Ticket,
	Train,
	Truck,
	UtensilsCrossed,
	WashingMachine,
	Watch,
	Wheat,
	Wine,
	Wrench
} from 'lucide-static';

// Generic marks for common kinds of business, drawn from Lucide's icons (ISC licence).
// Deliberately no real brands: a receipt with a real company's logo passes for one of theirs.

export interface LogoOption {
	id: string;
	name: string;
	/** Extra words the search matches */
	keywords: string;
	icon: string;
}

const logo = (id: string, name: string, icon: string, keywords = ''): LogoOption => ({ id, name, icon, keywords });

export const LOGOS: LogoOption[] = [
	logo('coffee', 'Coffee', Coffee, 'cafe espresso latte'),
	logo('bakery', 'Bakery', Croissant, 'pastry patisserie'),
	logo('bread', 'Bread', Wheat, 'bakery grain'),
	logo('cakes', 'Cakes', CakeSlice, 'dessert patisserie'),
	logo('cupcakes', 'Cupcakes', Cupcake, 'dessert sweets'),
	logo('donuts', 'Donuts', Donut, 'doughnut dessert'),
	logo('cookies', 'Cookies', Cookie, 'biscuits dessert'),
	logo('burgers', 'Burgers', Hamburger, 'fast food diner'),
	logo('pizza', 'Pizza', Pizza, 'italian takeaway'),
	logo('sandwiches', 'Sandwiches', Sandwich, 'deli lunch'),
	logo('chicken', 'Chicken', Drumstick, 'fried grill'),
	logo('soup', 'Noodles', Soup, 'ramen soup bowl asian'),
	logo('salads', 'Salads', Salad, 'healthy vegan'),
	logo('restaurant', 'Restaurant', UtensilsCrossed, 'dining kitchen'),
	logo('chef', 'Kitchen', ChefHat, 'chef restaurant catering'),
	logo('catering', 'Catering', HandPlatter, 'service events'),
	logo('ice-cream', 'Ice cream', IceCreamCone, 'gelato dessert'),
	logo('frozen', 'Frozen treats', Popsicle, 'ice lolly'),
	logo('juice', 'Juice', Citrus, 'smoothie fresh'),
	logo('drinks', 'Drinks', CupSoda, 'soda smoothie bubble tea'),
	logo('tea', 'Tea', Leaf, 'chai herbal'),
	logo('bar', 'Bar', Martini, 'cocktails lounge'),
	logo('brewery', 'Brewery', Beer, 'pub beer'),
	logo('wine', 'Wine', Wine, 'bar cellar'),
	logo('bottle-shop', 'Bottle shop', BottleWine, 'liquor off licence'),
	logo('grocery', 'Grocery', ShoppingBasket, 'kirana provisions'),
	logo('supermarket', 'Supermarket', ShoppingCart, 'mart store'),
	logo('produce', 'Fruit', Apple, 'produce greengrocer'),
	logo('vegetables', 'Vegetables', Carrot, 'produce farm'),
	logo('fish', 'Seafood', Fish, 'fishmonger'),
	logo('butcher', 'Butcher', Ham, 'meat deli'),
	logo('dairy', 'Dairy', Milk, 'milk cheese'),
	logo('sweets', 'Sweets', Candy, 'mithai candy confectionery'),
	logo('florist', 'Florist', Flower2, 'flowers bouquet'),
	logo('garden', 'Garden', Sprout, 'nursery plants'),
	logo('pharmacy', 'Pharmacy', Pill, 'chemist medical'),
	logo('clinic', 'Clinic', Stethoscope, 'doctor health'),
	logo('books', 'Books', BookOpen, 'bookstore library'),
	logo('stationery', 'Stationery', Pencil, 'office supplies'),
	logo('art', 'Art supplies', Palette, 'studio gallery'),
	logo('hardware', 'Hardware', Hammer, 'tools diy'),
	logo('repairs', 'Repairs', Wrench, 'service mechanic'),
	logo('decor', 'Paint & decor', PaintRoller, 'home improvement'),
	logo('fuel', 'Fuel', Fuel, 'petrol gas station'),
	logo('auto', 'Auto care', Car, 'car wash garage'),
	logo('taxi', 'Taxi', CarTaxiFront, 'cab ride'),
	logo('bikes', 'Bikes', Bike, 'cycle shop'),
	logo('fashion', 'Fashion', Shirt, 'clothing apparel'),
	logo('boutique', 'Boutique', ShoppingBag, 'retail shop'),
	logo('salon', 'Salon', Scissors, 'barber hair'),
	logo('beauty', 'Beauty', Sparkles, 'spa cosmetics'),
	logo('cosmetics', 'Cosmetics', Brush, 'makeup beauty'),
	logo('gym', 'Gym', Dumbbell, 'fitness training'),
	logo('pets', 'Pets', PawPrint, 'pet shop vet'),
	logo('phones', 'Phones', Smartphone, 'mobile electronics'),
	logo('electronics', 'Electronics', Laptop, 'computers tech'),
	logo('audio', 'Audio', Headphones, 'sound electronics'),
	logo('music', 'Music', Music, 'records instruments'),
	logo('instruments', 'Instruments', Guitar, 'music shop'),
	logo('cinema', 'Cinema', Film, 'movies theatre'),
	logo('snacks', 'Snacks', Popcorn, 'cinema concessions'),
	logo('tickets', 'Tickets', Ticket, 'events admission'),
	logo('gifts', 'Gifts', Gift, 'presents souvenirs'),
	logo('jewellery', 'Jewellery', Gem, 'jewelry jeweller'),
	logo('watches', 'Watches', Watch, 'clocks jewellery'),
	logo('optician', 'Optician', Glasses, 'eyewear glasses'),
	logo('photo', 'Photo', Camera, 'studio prints'),
	logo('laundry', 'Laundry', WashingMachine, 'dry cleaning'),
	logo('cleaning', 'Cleaning', SprayCan, 'housekeeping'),
	logo('hotel', 'Hotel', Hotel, 'stay lodging'),
	logo('rooms', 'Rooms', BedDouble, 'guest house inn'),
	logo('camping', 'Outdoors', Tent, 'camping adventure'),
	logo('travel', 'Travel', Plane, 'airline agency'),
	logo('rail', 'Rail', Train, 'transit station'),
	logo('bus', 'Bus', Bus, 'transit coach'),
	logo('delivery', 'Delivery', Truck, 'courier logistics'),
	logo('parcels', 'Parcels', Package, 'shipping post'),
	logo('shop', 'Shop', Store, 'retail general store')
];

export type LogoStyle = 'badge' | 'solid' | 'plain';

export const LOGO_STYLES: { value: LogoStyle; label: string }[] = [
	{ value: 'badge', label: 'Badge' },
	{ value: 'solid', label: 'Solid' },
	{ value: 'plain', label: 'Plain' }
];

const INK = '#1a1a1a';

/** The icon's shapes, without its 24×24 <svg> wrapper */
function shapes(icon: string): string {
	return /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(icon)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
}

/** A square mark: the icon in an outlined ring, on a solid disc, or on its own */
export function logoSvg(icon: string, style: LogoStyle): string {
	const glyph = (size: number, colour: string, width: number) => {
		const offset = (120 - size) / 2;
		return (
			`<g transform="translate(${offset} ${offset}) scale(${size / 24})" fill="none" stroke="${colour}" ` +
			`stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${shapes(icon)}</g>`
		);
	};
	const body =
		style === 'badge'
			? `<circle cx="60" cy="60" r="56" fill="none" stroke="${INK}" stroke-width="5"/>${glyph(58, INK, 2)}`
			: style === 'solid'
				? `<circle cx="60" cy="60" r="58" fill="${INK}"/>${glyph(60, '#fff', 2)}`
				: glyph(104, INK, 1.6);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${body}</svg>`;
}

export const logoDataUrl = (icon: string, style: LogoStyle) => `data:image/svg+xml;base64,${btoa(logoSvg(icon, style))}`;

export function searchLogos(query: string): LogoOption[] {
	const q = query.trim().toLowerCase();
	if (!q) return LOGOS;
	return LOGOS.filter((l) => `${l.name} ${l.keywords}`.toLowerCase().includes(q));
}
