const https = require('https');
const url = require('url');
const zlib = require('zlib');

class APIRequestManager {
	static get BASE_URL() {return 'https://discordapp.com/api';}

	constructor(bot) {
		this.bot = bot;

		this.globalQueue = null;

		this.limits = {};
		this.queue = {};
	}

	request(method, endpoint, payload, callback) {
		if (endpoint.charCodeAt(0) !== 47) endpoint = '/' + endpoint;

		var addr = url.parse(this.constructor.BASE_URL + endpoint);

		if (!callback) {
			callback = payload;
			payload = undefined;
		}

		if (this.globalQueue) {
			this.globalQueue.push({
				method: method,
				endpoint: endpoint,
				payload: payload,
				callback: callback
			});

			return;
		}

		var limitName = endpoint.startsWith('/channels/') || endpoint.startsWith('/guilds/') ? endpoint.substr(0, endpoint.indexOf('/', 11)) : endpoint;
		var limit = this.limits[limitName];

		console.log(endpoint, 'before', Date.now(), this.limits);

		if (limit === null) {
			// This endpoint has no clear rate limits. Make the request and hope for the best
		} else if (!limit) {
			// We don't know the limits yet, as no requests to this endpoint have been made yet

			this.limits[limitName] = limit = {
				remaining: 0,
				reset: null
			};
		} else if (!limit.reset || (limit.remaining === 0 && Date.now() < limit.reset)) {
			// We don't know the limits yet, but a request was already made or we exceeded the limit for this period

			if (!this.queue[limitName]) {
				this.queue[limitName] = [];

				if (limit.reset) setTimeout(() => this.processQueue(limitName), limit.reset - Date.now() + 200);
			}

			this.queue[limitName].push({
				method: method,
				endpoint: endpoint,
				payload: payload,
				callback: callback
			});

			return;
		} else if (Date.now() >= limit.reset) {
			// We exceeded the limits for previous period but can make requests again

			limit.remaining = limit.limit - 1;
		} else {
			// Rate limits are known and we can still make requests

			limit.remaining--;
		}

		var reqOpts = {
			method: method,
			hostname: addr.hostname,
			path: addr.path,
			headers: {
				Host: addr.hostname,
				'User-Agent': 'SimpleFramework (https://github.com/opl-/discord-simple-framework, ' + this.bot.VERSION + ')',
				DNT: 1,
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate',
				Authorization: (this.bot.bot ? 'Bot ' : '') + this.bot.internals.token
			}
		};

		var toSend = null;

		if (!payload) {
			// NOOP
		} else if (payload instanceof Multipart || (Object.getPrototypeOf(payload) !== Object.prototype && payload.result)) {
			reqOpts.headers['Content-Type'] = 'multipart/form-data; boundary=' + payload.boundary;
			toSend = payload.result;
		} else {
			reqOpts.headers['Content-Type'] = 'application/json';
			toSend = JSON.stringify(payload);
		}

		var req = https.request(reqOpts, res => {
			if (res.headers['x-ratelimit-global']) {
				// NOOP: Will be handled when we receive the payload
			} else if (!res.headers['x-ratelimit-limit']) {
				// This endpoint has no clear ratelimit

				this.limits[limitName] = null;
			} else {
				// This endpoint has a limit and we are not globally rate limited

				var limitReset = parseInt(res.headers['x-ratelimit-reset']) * 1000;

				if (limit.reset !== limitReset) {
					if (limit.reset === null) {
						limit.remaining = parseInt(res.headers['x-ratelimit-remaining']);

						if (this.queue[limitName]) process.nextTick(() => this.processQueue(limitName));
					}

					limit.limit = parseInt(res.headers['x-ratelimit-limit']);
					limit.reset = limitReset;
				}
			}

			console.log(endpoint, 'after', Date.now(), this.limits);

			var body = [];

			res.on('data', d => body.push(d));

			res.once('end', () => {
				body = Buffer.concat(body);

				zlib.gunzip(body, (err, data) => {
					if (res.statusCode === 429) {
						// We are being rate limited

						data = JSON.parse(data.toString());

						if (data.global && !this.globalQueue) {
							// We are being globally rate limited and theres no global queue yet

							this.globalQueue = [];

							setTimeout(() => this.processGlobalQueue(), data.retry_after + 200);
						}

						// Make this request again where it will most likely get put in the queue again
						this.request(method, endpoint, payload, callback);
					} else {
						if (!err) data = data.toString();

						try {
							res.body = JSON.parse(data || body);
						} catch (ex) {}

						return callback(null, res);
					}
				});
			});
		}).once('error', err => callback(err, null));

		if (toSend) req.write(toSend);

		req.end();
	}

	processGlobalQueue() {
		var queue = this.globalQueue;
		this.globalQueue = null;

		for (var req of queue) this.request(req.method, req.endpoint, req.payload, req.callback);
	}

	processQueue(limitName) {
		var queue = this.queue[limitName];
		this.queue[limitName] = undefined;

		for (var req of queue) this.request(req.method, req.endpoint, req.payload, req.callback);
	}
}

// Very similar to Discord.io's implementation for compatibility
class Multipart {
	constructor() {
		this.boundary = 'gd0p5Jq1M2Zt09jU634d0p';
		this.result = [];
	}

	append(data) {
		this.result.push('\r\n--' + this.boundary + '\r\nContent-Disposition: form-data; name="' + data[0] + '"');

		if (data[2]) this.result.push('; filename="' + data[2] + '"\r\nContent-Type: application/octet-stream');

		this.result.push('\r\n\r\n' + (data[1] instanceof Buffer ? data[1].toString() : data[1]));
	}

	finalize() {
		this.result = this.result.join('') + '\r\n--' + this.boundary + '--';
	}
}

APIRequestManager.Multipart = Multipart;

module.exports = APIRequestManager;
