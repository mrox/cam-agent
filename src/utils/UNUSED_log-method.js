import config from '../config';

const checkMessage = (mess) => {
    if(!config.log || !mess) return;
    if(typeof mess ==="object") mess = JSON.stringify(mess)
    return mess;
}

const getDate = () => {
    const d = new Date();
    return d.getDate()  + "-" + (d.getMonth()+1) + "-" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes();
}

var colors = {
    Reset: "\x1b[0m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m"
};

var infoLog = console.info;
var logLog = console.log;
var errorLog = console.error;
var warnLog = console.warn;

console.info = function (args) {
    var copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(colors.Green);
    copyArgs.push(colors.Reset);
    infoLog.apply(null, copyArgs);
};

console.warn = function (args) {
    var copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(colors.Yellow);
    copyArgs.push(colors.Reset);
    warnLog.apply(null, copyArgs);
};
console.error = function (args) {
    var copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(colors.Red);
    copyArgs.push(colors.Reset);
    errorLog.apply(null, copyArgs);
};

export const logInfo = (message) => {
    message = checkMessage(message);
    if(message) console.log(`[${getDate()}] [INFO] ${message}`)
}

export const logSuccess = (message) => {
    message = checkMessage(message);
    if(message) console.info(`[${getDate()}] [SUCCESS] ${message}`)
}

export const logErr = (err) => {
    err = checkMessage(err);
    if(err) console.error(`[${getDate()}] [ERROR] ${err}`)
}   

export const logWarn = (message) => {
    message = checkMessage(message);
    if(message) console.warn(`[${getDate()}] [WARN] ${message}`);
}