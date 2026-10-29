export interface ToastAction {
	label: string;
	run: () => void;
}

export interface Toast {
	id: number;
	message: string;
	tone: 'info' | 'error';
	actions: ToastAction[];
}

let seq = 0;

class Toaster {
	items = $state<Toast[]>([]);

	show(message: string, opts: { tone?: Toast['tone']; actions?: ToastAction[]; duration?: number } = {}) {
		const id = ++seq;
		const tone = opts.tone ?? 'info';
		this.items = [...this.items.slice(-2), { id, message, tone, actions: opts.actions ?? [] }];
		// Errors and toasts you can act on (Undo, Open) stay up longer
		const lingers = tone === 'error' || Boolean(opts.actions?.length);
		setTimeout(() => this.dismiss(id), opts.duration ?? (lingers ? 8000 : 4000));
	}

	error(message: string) {
		this.show(message, { tone: 'error' });
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new Toaster();
