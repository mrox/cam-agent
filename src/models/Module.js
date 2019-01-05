import config from '../config';
import findProcess from 'find-process';
import last from 'lodash/last';

class Module {
    constructor(data){
        const { id, command, name, version, date, link, os, cpu } = data;
        this.id = id; 
        this.command = command;
        this.name = name;
        this.version = version;
        this.date = date;
        this.link = link;
        this.os = os; 
        this.cpu = cpu;
    }

    path(){
        return `${config.base_dir}/module/${this.id}-${this.name}`
    }

    async getBashProcess(){
        var list = await findProcess('name', this.path())
        const process = list.find(({name}) => name === "bash");
        if(process) 
            return {
                pid: process.pid,
                runningVersion: last(process.cmd.split('/')).replace(".sh", '')
            }
        return false
    }
}

export default Module;