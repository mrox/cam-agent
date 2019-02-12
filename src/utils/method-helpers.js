import fs from 'fs';

const xml2js = require('xml2js')
	, numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/
	, dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/
	, prefixMatch = /(?!xmlns)^.*:/
	;

export const asyncForEach = async (array, callback) => {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array)
	}
}

/**
 * Parse SOAP object to pretty JS-object
 * @param {object} xml
 * @returns {object}
 */
export const linerase = function (xml) {
	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(linerase);
		} else {
			xml = xml[0];
		}
	}
	if (typeof xml === 'object') {
		var obj = {};
		Object.keys(xml).forEach(function (key) {
			if (key === '$') {
				obj.$ = linerase(xml.$);
			} else {
				obj[key] = linerase(xml[key]);
			}
		});
		return obj;
	} else {
		if (xml === 'true') { return true; }
		if (xml === 'false') { return false; }
		if (numberRE.test(xml)) { return parseFloat(xml); }
		if (dateRE.test(xml)) { return new Date(xml); }
		return xml;
	}
};

/**
 * @callback ParseSOAPStringCallback
 * @property {?Error} error
 * @property {object} SOAP response
 * @property {string} raw XML
 */

/**
 * Parse SOAP response
 * @param {string} xml
 * @param {ParseSOAPStringCallback} callback
 */
export const parseSOAPString = function (xml, callback) {
	/* Filter out xml name spaces */
	xml = xml.replace(/xmlns(.*?)=(".*?")/g, '');

	xml2js.parseString(
		xml
		, {
			tagNameProcessors: [function (str) {
				str = str.replace(prefixMatch, '');
				var secondLetter = str.charAt(1);
				if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
					return str.charAt(0).toLowerCase() + str.slice(1);
				} else {
					return str;
				}
			}]
		}
		, function (err, result) {
			if (!result || !result['envelope'] || !result['envelope']['body']) {
				callback(new Error('Wrong ONVIF SOAP response'), null, xml);
			} else {
				if (!err && result['envelope']['body'][0]['fault']) {
					var fault = result['envelope']['body'][0]['fault'][0];
					var reason;
					if (fault['reason'][0]['text'][0]._) {
						reason = fault['reason'][0]['text'][0]._;
					}
					if (!reason) {
						reason = JSON.stringify(linerase(result.envelope.body[0].fault[0].code[0]));
					}
					var detail = '';
					if (result.envelope.body[0].fault[0].detail && result.envelope.body[0].fault[0].detail[0].text[0]) {
						detail = result.envelope.body[0].fault[0].detail[0].text[0];
					}

					// console.error('Fault:', reason, detail);
					err = new Error('ONVIF SOAP Fault: ' + (reason) + (detail));
				}
				callback(err, result['envelope']['body'], xml);
			}
		});
};

export const s4 = function () {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
};

/**
 * Generate GUID
 * @returns {string}
 */
export const guid = function () {
	return (s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4());
};

export const parseCmdLocal = (cmdLocalPath) => {
	if (!cmdLocalPath) return null;
	var ips
	try {
		ips = fs.readFileSync(cmdLocalPath, "utf8");
		ips = JSON.parse(ips);
	} catch (error) {
		throw new Error(error.message)
	}

	if (!Array.isArray(ips)) return null;
	const rt = {}
	for (let i = 0; i < ips.length; i += 4) {
		var item = ips[i];
		const chanelId = item[1];
		const rtsp = item[2]["encoder_opt"].src;
		const ip = rtsp.match(/(\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3})[\/:]/);
		const up = rtsp.match(/\/\/(.*):(.*)@/);
		if (ip) {
			rt[ip[1]] = {
				chanel: chanelId,
			};
			if (up) {
				rt[ip[1]].username = up[1] || '',
					rt[ip[1]].password = up[2] || ''
			}
		}
	}
	return rt
}

export function callbackToPromise(...args) {
	const func = args[0];
	if (typeof func !== 'function')
		throw new Error("The first argument must be function!")

	return new Promise((resolve, reject) => {
		var callback = (err, value) => {

			if (err) reject(err)
			else resolve(value)
		}
		func.apply(null, [...args.slice(1), callback])
	})
}