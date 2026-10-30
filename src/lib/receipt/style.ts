import { cleanFamily, fontStack } from './fonts';
import { clamp, cssColor } from './html';
import { TEMPLATE_INFO } from './meta';
import type { Edge, ReceiptStyle, TemplateId } from './types';

export interface ResolvedStyle {
	fontFamily: string;
	fontStack: string;
	fontSize: number;
	footerFontSize: number;
	barcodeFontSize: number;
	lineSpacing: number;
	backgroundColor: string;
	color: string;
	barcodeColor: string;
	qrCodeColor: string;
	borderColor: string;
	borderRadius: number;
	width: number;
	edge: Edge;
}

const DEFAULT_STYLE = {
	fontFamily: 'monospace',
	fontSize: 14,
	footerFontSize: 12,
	barcodeFontSize: 11,
	lineSpacing: 1.4,
	backgroundColor: '#ffffff',
	color: '#484848',
	borderRadius: 2,
	edge: 'straight'
} as const;

function number(value: unknown, fallback: number, min: number, max: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

export function resolveStyle(style: ReceiptStyle, template: TemplateId): ResolvedStyle {
	const d = DEFAULT_STYLE;
	const family = cleanFamily(style.fontFamily ?? d.fontFamily);
	const color = cssColor(style.color, d.color);
	return {
		fontFamily: family,
		fontStack: fontStack(family),
		fontSize: number(style.fontSize, d.fontSize, 6, 48),
		footerFontSize: number(style.footerFontSize, d.footerFontSize, 6, 48),
		barcodeFontSize: number(style.barcodeFontSize, d.barcodeFontSize, 6, 48),
		lineSpacing: number(style.lineSpacing, d.lineSpacing, 0.8, 3),
		backgroundColor: cssColor(style.backgroundColor, d.backgroundColor),
		color,
		// Codes follow the ink colour unless set explicitly
		barcodeColor: cssColor(style.barcodeColor, color),
		qrCodeColor: cssColor(style.qrCodeColor, color),
		borderColor: cssColor(style.borderColor, ''),
		borderRadius: number(style.borderRadius, d.borderRadius, 0, 48),
		width: Math.round(number(style.width, TEMPLATE_INFO[template].width, 16, 120)),
		edge: style.edge === 'zigzag' ? 'zigzag' : 'straight'
	};
}

/** Saw-tooth top and bottom edges, drawn with a mask so the PNG stays transparent around them */
function zigzag(depth: number): string {
	const tooth = depth * 2;
	const mask = [
		`linear-gradient(#000 0 0) 50% 50%/100% calc(100% - ${depth * 2}px) no-repeat`,
		`conic-gradient(from 135deg at 50% 0,#000 90deg,#0000 0) 0 0/${tooth}px ${depth}px round no-repeat`,
		`conic-gradient(from -45deg at 50% 100%,#000 90deg,#0000 0) 0 100%/${tooth}px ${depth}px round no-repeat`
	].join(',');
	return `-webkit-mask:${mask};mask:${mask};`;
}

/** The paper: every template renders inside this #receipt element */
export function frame(s: ResolvedStyle, inner: string, padding = '24px'): string {
	const edge = s.edge === 'zigzag' ? zigzag(7) : `border-radius:${s.borderRadius}px;`;
	const border = s.borderColor ? `border:1px solid ${s.borderColor};` : '';
	return (
		`<div id="receipt" style="box-sizing:content-box;width:fit-content;padding:${padding};` +
		`background:${s.backgroundColor};color:${s.color};font-family:${s.fontStack};font-size:${s.fontSize}px;` +
		`line-height:${s.lineSpacing};overflow-wrap:break-word;text-align:left;` +
		`-webkit-print-color-adjust:exact;print-color-adjust:exact;${border}${edge}">` +
		`<div style="width:${s.width}ch">${inner}</div></div>`
	);
}
