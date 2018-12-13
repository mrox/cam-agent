import fs from 'fs';

const xml2js = require('xml2js'),
    numberRE = /^-?([1-9]\d*|0)(\.\d*)?$/,
    dateRE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/,
    prefixMatch = /(?!xmlns)^.*:/;


export const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

export const parseSOAPString = function (xml, callback) {
    xml = xml.replace(/xmlns(.*?)=(".*?")/g, '');
    xml2js.parseString(
        xml, {
            tagNameProcessors: [function (str) {
                str = str.replace(prefixMatch, '');
                var secondLetter = str.charAt(1);
                if (secondLetter && secondLetter.toUpperCase() !== secondLetter) {
                    return str.charAt(0).toLowerCase() + str.slice(1);
                } else {
                    return str;
                }
            }]
        },
        function (err, result) {
            if (!result || !result['envelope'] || !result['envelope']['body']) {
                callback(new Error('Wrong ONVIF SOAP response'), null, xml);
            } else {
                try {
                    if (!err && result['envelope']['body'][0]['fault']) {
                        err = new Error(
                            'ONVIF SOAP Fault: ' +
                            (
                                result.envelope.body[0].fault[0].reason[0].text[0]._ ||
                                JSON.stringify(linerase(result.envelope.body[0].fault[0].code[0]))
                            ) +
                            (
                                result.envelope.body[0].fault[0].detail ?
                                    ': ' + result.envelope.body[0].fault[0].detail[0].text[0] :
                                    ''
                            )
                        );
                    }
                } catch (error) {
                    err = new Error('error xml request');
                }
                callback(err, result['envelope']['body'], xml);
            }
        });
};

export const parseCmdLocal = (cmdLocalPath) => {
    if (!cmdLocalPath) return null;
    var ips
    try {
        ips = fs.readFileSync(cmdLocalPath, "utf8");
        ips = JSON.parse(ips);
    } catch (error) {
        throw new Error(error)
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
            if(up){
                rt[ip[1]].username= up[1] || '', 
                rt[ip[1]].password= up[2]  || ''
            }
        }
    }
    return rt
}
