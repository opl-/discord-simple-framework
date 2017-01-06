class ArgumentParser {
	static parse(str, opts = {}) {
		if (opts.returns && ['tokens', 'strings'].indexOf(opts.returns) === -1) throw new Error('Invalid value for `returns`: ' + opts.returns);

		var tokens = [];
		var token = null;

		var escaping = null;

		for (var i = 0; i < str.length; i++) {
			var c = str[i];

			if (escaping !== null) {
				escaping += c;

				if (escaping.length > 1) escaping = null;
				else if (['"', '\\', ' '].indexOf(c) === -1) throw new Error(`Unsupported escape sequence (\\${c}, ${i})`);
			} else if (c === '\\') {
				escaping = '';

				if (i === str.length - 1) throw new Error(`Unclosed escape sequence (${c}, ${i})`);

				continue;
			}

			if (!token) {
				if (c === '"' && escaping === null) {
					token = {
						type: 'longWord',
						value: '',
						startIndex: i
					};

					continue;
				} else {
					token = {
						type: 'word',
						value: '',
						startIndex: i
					};
				}
			}

			if (token.type === 'word') {
				if ((c === ' ' && escaping === null) || i === str.length - 1) {
					if (i === str.length - 1) {
						token.value += c;

						token.endIndex = i;
						token.length = i - token.startIndex + 1;
					} else {
						token.endIndex = i - 1;
						token.length = i - token.startIndex;
					}

					tokens.push(token);
					token = null;
				} else {
					token.value += c;
				}
			} else if (token.type === 'longWord') {
				if (c === '"' && escaping === null) {
					token.endIndex = i;
					token.length = i - token.startIndex + 1;

					tokens.push(token);
					token = null;
					if (i !== str.length - 1 && str[i + 1] !== ' ') throw new Error(`Unexpected character (${str[i + 1]}, ${i + 1})`);
					i++;
				} else {
					token.value += c;
				}
			}
		}

		if (token) throw new Error(`Unclosed sequence (${token.type})`);

		if (opts.returns === 'tokens') {
			return tokens;
		} else {
			var out = [];

			for (var t of tokens) out.push(t.value);

			return out;
		}
	}
}

module.exports = ArgumentParser;
