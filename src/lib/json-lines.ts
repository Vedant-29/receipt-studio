// Walks JSON text to find the line each field starts on, so problems can point at a line.
// It also explains syntax errors the same way in every browser (each one words JSON.parse's
// errors differently, and Safari doesn't say where).

interface SyntaxProblem {
	message: string;
	line: number;
	column: number;
}

type Located =
	| { lines: Map<string, number>; duplicates: { path: string; line: number }[]; error?: undefined }
	| { lines?: undefined; duplicates?: undefined; error: SyntaxProblem };

class Stop {
	constructor(
		readonly message: string,
		readonly at: number
	) {}
}

/** Paths are written the way issuePath() writes them: content.items[1].price */
export function locateJson(text: string): Located {
	const lines = new Map<string, number>();
	/** A field written twice in one object: JSON keeps the last one without a word */
	const duplicates: { path: string; line: number }[] = [];
	const starts = [0];
	for (let k = 0; k < text.length; k++) if (text[k] === '\n') starts.push(k + 1);
	const lineAt = (at: number) => {
		let lo = 0;
		let hi = starts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (starts[mid] <= at) lo = mid;
			else hi = mid - 1;
		}
		return lo + 1;
	};

	let i = 0;
	const n = text.length;
	const fail = (message: string, at = i): never => {
		throw new Stop(message, at);
	};
	const space = () => {
		while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++;
	};
	const describe = (c: string | undefined) => (c === undefined ? 'the end' : c === '\n' ? 'a line break' : `"${c}"`);
	const child = (path: string, key: string) => (path ? `${path}.${key}` : key);

	function string(): string {
		const start = i++;
		while (i < n) {
			const c = text[i];
			if (c === '"') {
				i++;
				return JSON.parse(text.slice(start, i)) as string;
			}
			if (c === '\\') {
				const e = text[i + 1];
				if (e === 'u') {
					if (!/^[0-9a-f]{4}$/i.test(text.slice(i + 2, i + 6))) fail('\\u needs four hex digits after it', i);
					i += 6;
				} else if (e !== undefined && '"\\/bfnrt'.includes(e)) i += 2;
				else fail(`"\\${e ?? ''}" isn't an escape JSON allows`, i);
				continue;
			}
			if (c < ' ') fail(c === '\n' ? 'Text can’t run onto the next line. Close the quote, or write \\n for a line break' : 'Text can’t contain control characters', i);
			i++;
		}
		return fail('This text is missing its closing quote', start);
	}

	function value(path: string) {
		space();
		const c = text[i];
		if (c === '{') return object(path);
		if (c === '[') return array(path);
		if (c === '"') return void string();
		const literal = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 400));
		if (literal) {
			i += literal[0].length;
			return;
		}
		if (c === "'") fail('Use double quotes, not single quotes');
		if (c === undefined) fail('The JSON ends where a value should be');
		if (c === '}' || c === ']') fail(`Expected a value before ${describe(c)}`);
		fail(/[a-z]/i.test(c) ? 'Text values need double quotes around them' : `Unexpected ${describe(c)}`);
	}

	function object(path: string) {
		i++;
		space();
		if (text[i] === '}') return void i++;
		for (;;) {
			space();
			if (text[i] === '}') fail('Remove the comma before }');
			if (text[i] !== '"') fail(text[i] === "'" ? 'Field names need double quotes, not single quotes' : 'Expected a field name in double quotes');
			const at = i;
			const key = string();
			const p = child(path, key);
			if (lines.has(p)) duplicates.push({ path: p, line: lineAt(at) });
			else lines.set(p, lineAt(at));
			space();
			if (text[i] !== ':') fail(`Expected : after "${key}"`);
			i++;
			value(p);
			space();
			if (text[i] === ',') {
				i++;
				continue;
			}
			if (text[i] === '}') return void i++;
			fail(i >= n ? 'The JSON ends before this object is closed with }' : 'Expected a comma or } here');
		}
	}

	function array(path: string) {
		i++;
		space();
		if (text[i] === ']') return void i++;
		for (let k = 0; ; k++) {
			space();
			if (text[i] === ']') fail('Remove the comma before ]');
			lines.set(`${path}[${k}]`, lineAt(i));
			value(`${path}[${k}]`);
			space();
			if (text[i] === ',') {
				i++;
				continue;
			}
			if (text[i] === ']') return void i++;
			fail(i >= n ? 'The JSON ends before this list is closed with ]' : 'Expected a comma or ] here');
		}
	}

	try {
		space();
		if (i >= n) fail('Paste a receipt as JSON');
		value('');
		space();
		if (i < n) fail('There is more after the end of the JSON');
		return { lines, duplicates };
	} catch (err) {
		if (!(err instanceof Stop)) throw err;
		const line = lineAt(Math.min(err.at, Math.max(0, n - 1)));
		return { error: { message: err.message, line, column: err.at - starts[line - 1] + 1 } };
	}
}
