class Command {
	constructor(bot, opts = {}) {
		this.bot = bot;

		if (typeof(opts) === 'function') opts = {
			handler: opts
		};

		this.handler = opts.handler;

		this.aliases = opts.generalHandler ? null : {};

		this.subcommands = {};
		if (opts.subcommands) for (var scn in opts.subcommands) this.addSubcommand(scn, opts.subcommands[scn]);

		this.description = opts.description || null;
		this.usage = opts.usage || null;

		this.channelCooldown = typeof(opts.channelCooldown) === 'number' ? (opts.channelCooldown > 0 ? opts.channelCooldown : false) : false;
		this.userCooldown = typeof(opts.userCooldown) === 'number' ? (opts.userCooldown > 0 ? opts.userCooldown : false) : false;
		this.argsDef = opts.args || 'parsed';

		this._lastUse = {};
	}

	handle(event, message, args) {
		if (this.channelCooldown) {
			if (this._lastUse[event.channel_id] + this.channelCooldown > Date.now()) return;

			this._lastUse[event.channel_id] = Date.now();
		}

		if (this.userCooldown) {
			if (this._lastUse[event.author.id] + this.userCooldown > Date.now()) return;

			this._lastUse[event.author.id] = Date.now();
		}

		if (args.length > 0 && this.subcommands[args[0].value.toLowerCase()]) {
			this.subcommands[args[0].value.toLowerCase()].handle(event, message, args.slice(1));
		} else if (this.handler) {
			if (this.argsDef === 'parsed') {
				this.handler(event, args.map(t => t.value));
			} else if (this.argsDef === 'tokens') {
				this.handler(event, args);
			} else if (this.argsDef === 'raw') {
				this.handler(event, args.length > 0 ? message.substr(args[0].startIndex) : '');
			}
		}
	}

	hasSubcommands() {
		return Object.keys(this.subcommands) > 0;
	}

	addSubcommand(aliases, opts) {
		if (typeof(aliases) === 'string') aliases = [aliases];

		for (var i = 0; i < aliases.length; i++) {
			var alias = aliases[i].toLowerCase();

			aliases[i] = alias;

			if (this.subcommands[alias]) throw new Error(`Subcommand "${alias}" already exists`);
		}

		var cmd = opts instanceof Command ? opts : new Command(this.bot, opts);

		cmd.aliases[this] = aliases;

		for (var a of aliases) this.subcommands[a] = cmd;

		return cmd;
	}
}

module.exports = Command;
